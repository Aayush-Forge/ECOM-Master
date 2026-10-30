/**
 * Notifications & Guest Order Email E2E Test Suite
 *
 * Verifies:
 * 1. Customer order with logged-in user automatically stores user's email on Order.
 * 2. Status transitions emit events and log notifications with stable idempotency_key.
 * 3. Guest checkout without email is rejected with 400.
 * 4. Guest checkout with email succeeds, stores email on Order, and dispatches confirmation to guest.
 * 5. Notification idempotency: stable key uniqueness prevents duplicate rows.
 * 6. Safe retries: retrying a previously failed notification safely updates the existing row to 'sent'.
 *
 * Run: node backend/test/notifications.e2e.js
 */

const { Client } = require('pg');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sridattam.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'customer@sridattam.com';
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'password123';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://sridattam_admin:sridattam_secure_pass_2026@localhost:5432/sridattam_dev_db?schema=public';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✅ PASS: ${msg}`);
    testsPassed++;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function run() {
  console.log('====================================================');
  console.log('  STARTING NOTIFICATIONS & GUEST EMAIL E2E TEST SUITE');
  console.log('====================================================');

  const pgClient = new Client({ connectionString: DATABASE_URL });
  await pgClient.connect();

  const createdOrderIds = [];

  try {
    const adminToken = await loginUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    const customerToken = await loginUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const customerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    };

    // Fetch existing product
    const productsRes = await fetch(`${BASE_URL}/all-products`);
    assert(productsRes.ok, 'Fetch /all-products succeeded');
    const productsJson = await productsRes.json();
    const products = Array.isArray(productsJson) ? productsJson : productsJson.data || [];
    const product = products.find(
      (p) =>
        (p.type === 'simple' || !p.variationsData || p.variationsData.length === 0) &&
        Number(p.basePrice) > 0,
    );
    assert(!!product, `Found simple active product for test: ${product?.id} (${product?.title})`);

    // -------------------------------------------------------------
    // Test 1: Logged-in Customer Order Placement (auto populates Order.email)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Customer Order Placement & Auto-Email Resolution ---');
    const orderPayload = {
      items: [{ productId: product.id, quantity: 1 }],
      shippingAddress: {
        fullName: 'E2E Notification Test Customer',
        phone: '9876543210',
        addressLine1: 'Test Address Line 1',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
    };

    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify(orderPayload),
    });
    if (orderRes.status !== 201) {
      console.error('Order creation failed with body:', await orderRes.text());
    }
    assert(orderRes.status === 201, `Customer create order returned 201: got ${orderRes.status}`);
    const order = await orderRes.json();
    createdOrderIds.push(order.id);
    assert(order.status === 'payment_pending', 'Initial status is payment_pending');

    // Verify Order.email in database
    const dbOrderRes = await pgClient.query(`SELECT email FROM orders WHERE id = $1`, [order.id]);
    assert(dbOrderRes.rows[0].email === CUSTOMER_EMAIL, `Order.email automatically populated in DB: got ${dbOrderRes.rows[0].email}`);

    // Transition to 'paid'
    const payRes = await fetch(`${BASE_URL}/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'paid' }),
    });
    assert(payRes.ok, `Transition to paid returned 200: got ${payRes.status}`);

    // Wait for InProcessPublisher async job execution
    await sleep(350);

    // Verify NotificationLog table for customer confirmation
    const paidLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE order_id = $1 AND template_key = 'order_confirmation'`,
      [order.id],
    );
    assert(paidLogsRes.rows.length === 1, `1 order_confirmation notification log created for order`);
    const confLog = paidLogsRes.rows[0];
    assert(confLog.status === 'sent', `order_confirmation status is 'sent': got ${confLog.status}`);
    assert(confLog.recipient === CUSTOMER_EMAIL, `recipient matches customer email: got ${confLog.recipient}`);
    assert(confLog.idempotency_key === `order:${order.id}:order_confirmation`, `idempotency_key is stable: got ${confLog.idempotency_key}`);

    // Verify NotificationLog table for internal alert (if INTERNAL_ALERT_EMAILS set)
    const internalLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE order_id = $1 AND template_key = 'internal_new_order'`,
      [order.id],
    );
    assert(internalLogsRes.rows.length >= 1, `internal_new_order notification log created`);
    assert(internalLogsRes.rows[0].status === 'sent', `internal_new_order status is 'sent'`);
    assert(internalLogsRes.rows[0].idempotency_key.startsWith(`order:${order.id}:internal_new_order:internal:`), `internal alert has deterministic key`);

    // -------------------------------------------------------------
    // Test 2: Lifecycle Transitions (Processing -> Shipped -> Delivered)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Lifecycle Status Transitions ---');

    // 1. Processing
    const procRes = await fetch(`${BASE_URL}/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'processing' }),
    });
    assert(procRes.ok, `Transition to processing returned 200: got ${procRes.status}`);
    await sleep(350);

    const procLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE order_id = $1 AND template_key = 'status_processing'`,
      [order.id],
    );
    assert(procLogsRes.rows.length === 1, `status_processing log created`);
    assert(procLogsRes.rows[0].status === 'sent', `status_processing status is 'sent'`);
    assert(procLogsRes.rows[0].idempotency_key === `order:${order.id}:status_processing`, `stable key on processing`);

    // 2. Shipped
    const shipRes = await fetch(`${BASE_URL}/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'shipped' }),
    });
    assert(shipRes.ok, `Transition to shipped returned 200: got ${shipRes.status}`);
    await sleep(350);

    const shipLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE order_id = $1 AND template_key = 'status_shipped'`,
      [order.id],
    );
    assert(shipLogsRes.rows.length === 1, `status_shipped log created`);
    assert(shipLogsRes.rows[0].status === 'sent', `status_shipped status is 'sent'`);

    // 3. Delivered
    const delRes = await fetch(`${BASE_URL}/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'delivered' }),
    });
    assert(delRes.ok, `Transition to delivered returned 200: got ${delRes.status}`);
    await sleep(350);

    const delLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE order_id = $1 AND template_key = 'status_delivered'`,
      [order.id],
    );
    assert(delLogsRes.rows.length === 1, `status_delivered log created`);
    assert(delLogsRes.rows[0].status === 'sent', `status_delivered status is 'sent'`);

    // -------------------------------------------------------------
    // Test 3: Order Cancellation
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Order Cancellation ---');
    const order2Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify(orderPayload),
    });
    assert(order2Res.status === 201, `Create second order returned 201`);
    const order2 = await order2Res.json();
    createdOrderIds.push(order2.id);

    const cancelRes = await fetch(`${BASE_URL}/admin/orders/${order2.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'cancelled', note: 'Customer cancelled test order' }),
    });
    assert(cancelRes.ok, `Cancel order returned 200: got ${cancelRes.status}`);
    await sleep(350);

    const cancelLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE order_id = $1 AND template_key = 'order_cancelled'`,
      [order2.id],
    );
    assert(cancelLogsRes.rows.length === 1, `order_cancelled log created`);
    assert(cancelLogsRes.rows[0].status === 'sent', `order_cancelled status is 'sent'`);
    assert(cancelLogsRes.rows[0].idempotency_key === `order:${order2.id}:order_cancelled`, `stable cancellation key`);

    // -------------------------------------------------------------
    // Test 4: Idempotency Enforcement & Safe Retries
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Idempotency Enforcement & Safe Retries ---');
    
    // 4a: Unique constraint on idempotency_key prevents duplicate row creation in DB
    let uniqueConstraintViolated = false;
    try {
      await pgClient.query(
        `INSERT INTO notification_log (id, idempotency_key, order_id, template_key, recipient, status, sent_at)
         VALUES (gen_random_uuid(), $1, $2, 'order_confirmation', $3, 'sent', NOW())`,
        [`order:${order.id}:order_confirmation`, order.id, CUSTOMER_EMAIL],
      );
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        uniqueConstraintViolated = true;
      }
    }
    assert(uniqueConstraintViolated, `Database unique constraint on (idempotency_key) prevented duplicate row`);

    // 4b: Simulate previously failed notification being retried (BullMQ retry pattern)
    // Create an order for retry simulation
    const retryOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify(orderPayload),
    });
    assert(retryOrderRes.status === 201, `Create retry test order returned 201`);
    const retryOrder = await retryOrderRes.json();
    createdOrderIds.push(retryOrder.id);

    // Pre-insert a failed log representing a previous attempt (e.g. temporary SMTP timeout)
    const retryIdempotencyKey = `order:${retryOrder.id}:status_processing`;
    await pgClient.query(
      `INSERT INTO notification_log (id, idempotency_key, order_id, template_key, recipient, status, sent_at, error)
       VALUES (gen_random_uuid(), $1, $2, 'status_processing', $3, 'failed', NOW(), 'Simulated provider timeout')`,
      [retryIdempotencyKey, retryOrder.id, CUSTOMER_EMAIL],
    );

    const initialFailLogRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE idempotency_key = $1`,
      [retryIdempotencyKey],
    );
    assert(initialFailLogRes.rows.length === 1 && initialFailLogRes.rows[0].status === 'failed', `Pre-existing failed log established`);

    // First transition to paid
    await fetch(`${BASE_URL}/admin/orders/${retryOrder.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'paid' }),
    });

    // Now trigger transition to processing (triggers processor on existing failed key)
    const retryProcRes = await fetch(`${BASE_URL}/admin/orders/${retryOrder.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'processing' }),
    });
    assert(retryProcRes.ok, `Retry order transitioned to processing: 200`);
    await sleep(350);

    // Verify that the existing row was UPDATED to 'sent', error cleared, and no new row was created!
    const postRetryLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE idempotency_key = $1`,
      [retryIdempotencyKey],
    );
    assert(postRetryLogsRes.rows.length === 1, `Exactly 1 log exists (no duplicate row created on retry)`);
    assert(postRetryLogsRes.rows[0].status === 'sent', `Status safely updated from failed to 'sent': got ${postRetryLogsRes.rows[0].status}`);
    assert(postRetryLogsRes.rows[0].error === null, `Error field cleared on successful retry`);

    // -------------------------------------------------------------
    // Test 5: Guest Checkout Email Validation & Notification Delivery
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Guest Checkout Email & Notification Delivery ---');

    // 5a: Guest checkout WITHOUT email must be rejected with 400
    const guestOrderNoEmailRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    assert(guestOrderNoEmailRes.status === 400, `Guest checkout without email rejected with 400: got ${guestOrderNoEmailRes.status}`);
    const noEmailErr = await guestOrderNoEmailRes.json();
    assert(noEmailErr.message.includes('Email is required for guest checkout'), `Correct error message returned: "${noEmailErr.message}"`);

    // 5b: Guest checkout WITH valid email succeeds and persists email on Order
    const guestEmail = 'guest.purchaser@example.com';
    const guestPayload = {
      ...orderPayload,
      email: guestEmail,
    };

    const guestOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestPayload),
    });
    assert(guestOrderRes.status === 201, `Guest checkout with email returned 201: got ${guestOrderRes.status}`);
    const guestOrder = await guestOrderRes.json();
    createdOrderIds.push(guestOrder.id);
    assert(guestOrder.customerId === null, 'Guest order has null customerId');

    // Verify Order.email stored in DB
    const guestDbOrderRes = await pgClient.query(`SELECT email FROM orders WHERE id = $1`, [guestOrder.id]);
    assert(guestDbOrderRes.rows[0].email === guestEmail, `Guest email saved to Order.email in DB: got ${guestDbOrderRes.rows[0].email}`);

    // Admin marks guest order as paid -> triggers order_confirmation to guest email
    const guestPayRes = await fetch(`${BASE_URL}/admin/orders/${guestOrder.id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ toStatus: 'paid' }),
    });
    assert(guestPayRes.ok, `Guest order marked as paid returned 200`);
    await sleep(350);

    const guestLogsRes = await pgClient.query(
      `SELECT * FROM notification_log WHERE order_id = $1 AND template_key = 'order_confirmation'`,
      [guestOrder.id],
    );
    assert(guestLogsRes.rows.length === 1, `Guest order notification log recorded`);
    const guestLog = guestLogsRes.rows[0];
    assert(guestLog.status === 'sent', `Guest order notification status is 'sent': got ${guestLog.status}`);
    assert(guestLog.recipient === guestEmail, `Guest order recipient is guest email: got ${guestLog.recipient}`);
    assert(guestLog.idempotency_key === `order:${guestOrder.id}:order_confirmation`, `Guest notification has stable idempotency_key`);

    console.log('\n====================================================');
    console.log(`  ALL E2E NOTIFICATION & GUEST TESTS PASSED: ${testsPassed}/${testsPassed}`);
    console.log('====================================================');
  } finally {
    console.log('\n--- Running Test Cleanup ---');
    for (const orderId of createdOrderIds) {
      try {
        await pgClient.query(`DELETE FROM notification_log WHERE order_id = $1`, [orderId]);
        await pgClient.query(`DELETE FROM order_status_history WHERE order_id = $1`, [orderId]);
        await pgClient.query(`DELETE FROM order_addresses WHERE order_id = $1`, [orderId]);
        await pgClient.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
        await pgClient.query(`DELETE FROM payments WHERE order_id = $1`, [orderId]);
        await pgClient.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
        console.log(`Cleaned up test order: ${orderId}`);
      } catch (cleanErr) {
        console.warn(`Error cleaning up order ${orderId}: ${cleanErr.message}`);
      }
    }
    await pgClient.end();
  }
}

run().catch((err) => {
  console.error('Fatal error running notifications E2E test:', err);
  process.exit(1);
});
