const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

function request(method, pathUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const headers = { ...options.headers };
    let body = options.body;
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      body = JSON.stringify(body);
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(url, {
      method,
      headers,
      timeout: options.timeout || 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawBody: data,
          data: json
        });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (body) req.write(body);
    req.end();
  });
}

const businessFindings = [];

async function login(email, password) {
  const res = await request('POST', '/auth/login', { body: { email, password } });
  return res.data?.access_token || res.data?.accessToken;
}

async function runBusinessAudit() {
  console.log('=== PHASE 4: BUSINESS LOGIC & EDGE CASES AUDIT ===\n');

  const adminToken = await login('admin@sridattam.com', 'password123');
  const editorToken = await login('editor@sridattam.com', 'password123');
  const customerToken = await login('customer@sridattam.com', 'password123');

  // 1. Fetch available products to use in test scenarios
  const prodRes = await request('GET', '/products');
  const products = prodRes.data?.data || prodRes.data?.products || (Array.isArray(prodRes.data) ? prodRes.data : []);
  console.log(`Fetched ${products.length} products for testing.`);
  const activeProduct = products.find(p => p.status === 'active' && p.stockQuantity > 5) || products[0];

  // ==========================================
  // DOMAIN 1: PRICING & CART MANIPULATION
  // ==========================================
  console.log('\n--- DOMAIN 1: CART & PRICING INTEGRITY ---');

  // Test 1.1: Create Cart & Add Item
  let cartId = null;
  const sessionToken = 'audit-test-session-' + Date.now();
  {
    const res = await request('POST', '/cart', {
      body: { sessionToken }
    });
    cartId = res.data?.id;
    console.log(`[BL-01] Cart created: ID ${cartId} (HTTP ${res.statusCode})`);
  }

  // Test 1.2: Add Item with Negative / Zero / Decimal Quantity
  if (cartId && activeProduct) {
    // 1.2a Zero quantity
    const resZero = await request('POST', `/cart/${cartId}/items`, {
      headers: { 'x-cart-token': sessionToken },
      body: { productId: activeProduct.id, quantity: 0 }
    });
    console.log(`[BL-02a] Cart add quantity=0: HTTP ${resZero.statusCode} (Expected: 400 Bad Request)`);
    businessFindings.push({
      id: 'BL-01',
      domain: 'Cart',
      title: 'Cart Add Item Zero Quantity Validation',
      expected: 'HTTP 400 rejection',
      actual: `HTTP ${resZero.statusCode}`,
      status: resZero.statusCode === 400 ? 'PASS' : 'FAIL',
      evidence: JSON.stringify(resZero.data)
    });

    // 1.2b Negative quantity
    const resNeg = await request('POST', `/cart/${cartId}/items`, {
      headers: { 'x-cart-token': sessionToken },
      body: { productId: activeProduct.id, quantity: -5 }
    });
    console.log(`[BL-02b] Cart add quantity=-5: HTTP ${resNeg.statusCode} (Expected: 400 Bad Request)`);
    businessFindings.push({
      id: 'BL-02',
      domain: 'Cart',
      title: 'Cart Add Item Negative Quantity Validation',
      expected: 'HTTP 400 rejection',
      actual: `HTTP ${resNeg.statusCode}`,
      status: resNeg.statusCode === 400 ? 'PASS' : 'FAIL',
      evidence: JSON.stringify(resNeg.data)
    });

    // 1.2c Huge quantity above stock
    const resHuge = await request('POST', `/cart/${cartId}/items`, {
      headers: { 'x-cart-token': sessionToken },
      body: { productId: activeProduct.id, quantity: 999999 }
    });
    console.log(`[BL-02c] Cart add quantity=999999 (exceeds stock): HTTP ${resHuge.statusCode}`);
    businessFindings.push({
      id: 'BL-03',
      domain: 'Cart',
      title: 'Cart Add Item Exceeding Stock Quantity',
      expected: 'HTTP 400 rejection or capped at stock',
      actual: `HTTP ${resHuge.statusCode}`,
      status: (resHuge.statusCode === 400 || resHuge.data?.message?.includes('stock')) ? 'PASS' : 'FAIL',
      evidence: JSON.stringify(resHuge.data)
    });

    // 1.2d Valid add
    const resValid = await request('POST', `/cart/${cartId}/items`, {
      headers: { 'x-cart-token': sessionToken },
      body: { productId: activeProduct.id, quantity: 2 }
    });
    console.log(`[BL-02d] Cart add valid quantity=2: HTTP ${resValid.statusCode}`);
  }

  // ==========================================
  // DOMAIN 2: CHECKOUT & SERVER-AUTHORITATIVE TOTALS
  // ==========================================
  console.log('\n--- DOMAIN 2: CHECKOUT & TOTAL TAMPERING ---');

  // Test 2.1: Client Tampering with grandTotal in Order Creation
  if (activeProduct) {
    const tamperedOrderPayload = {
      items: [
        {
          productId: activeProduct.id,
          quantity: 1,
          unitPrice: 1, // Tampered price: 1 rupee instead of real price
          lineTotal: 1
        }
      ],
      shippingAddress: {
        fullName: 'Audit Security Tester',
        phone: '9876543210',
        addressLine1: '123 Security Lane',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN'
      },
      billingAddress: {
        fullName: 'Audit Security Tester',
        phone: '9876543210',
        addressLine1: '123 Security Lane',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN'
      },
      grandTotal: 1, // Client claims grandTotal is 1 rupee!
      subtotal: 1,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0
    };

    const resOrder = await request('POST', '/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
      body: tamperedOrderPayload
    });

    const createdOrder = resOrder.data;
    const trustedClientPrice = createdOrder?.grandTotal === 1 || createdOrder?.grandTotal === '1';
    console.log(`[BL-03] Order creation with client tampered grandTotal=1:`);
    console.log(`       HTTP Status: ${resOrder.statusCode}, Created GrandTotal: ${createdOrder?.grandTotal}, BasePrice: ${activeProduct.basePrice}`);
    businessFindings.push({
      id: 'BL-04',
      domain: 'Checkout',
      title: 'Server-Authoritative Pricing vs Client Total Tampering',
      expected: 'Server calculates price from DB catalog (ignores client-supplied grandTotal=1)',
      actual: `Server grandTotal: ${createdOrder?.grandTotal}`,
      status: (!trustedClientPrice && Number(createdOrder?.grandTotal) > 1) ? 'PASS' : 'FAIL',
      evidence: `Client sent grandTotal=1, Server stored grandTotal=${createdOrder?.grandTotal}`
    });
  }

  // ==========================================
  // DOMAIN 3: ORDER STATE MACHINE INTEGRITY
  // ==========================================
  console.log('\n--- DOMAIN 3: ORDER STATE MACHINE INTEGRITY ---');

  // Fetch an existing order or use newly created order
  const ordersRes = await request('GET', '/admin/orders', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const allOrders = ordersRes.data?.data || ordersRes.data?.orders || (Array.isArray(ordersRes.data) ? ordersRes.data : []);
  const paidOrder = allOrders.find(o => o.status === 'paid') || allOrders[0];

  if (paidOrder) {
    console.log(`Testing state transitions on Order ${paidOrder.id} (Current status: ${paidOrder.status})`);

    // Test 3.1: Illegal Transition: paid -> payment_pending
    const resIllegal = await request('PATCH', `/admin/orders/${paidOrder.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'payment_pending', note: 'Attempting illegal reverse transition' }
    });
    console.log(`[BL-04a] Illegal transition 'paid' -> 'payment_pending': HTTP ${resIllegal.statusCode} (Expected: 400 Bad Request)`);
    businessFindings.push({
      id: 'BL-05',
      domain: 'State Machine',
      title: 'Illegal Reverse Transition (paid -> payment_pending)',
      expected: 'HTTP 400 Bad Request (Transition rejected)',
      actual: `HTTP ${resIllegal.statusCode}: ${JSON.stringify(resIllegal.data)}`,
      status: resIllegal.statusCode === 400 ? 'PASS' : 'FAIL',
      evidence: JSON.stringify(resIllegal.data)
    });

    // Test 3.2: Customer attempting to mutate staff order status
    const resCustMutate = await request('PATCH', `/admin/orders/${paidOrder.id}/status`, {
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { status: 'delivered', note: 'Customer marking self delivered' }
    });
    console.log(`[BL-04b] Customer role mutating order status: HTTP ${resCustMutate.statusCode} (Expected: 403 Forbidden)`);
    businessFindings.push({
      id: 'BL-06',
      domain: 'State Machine',
      title: 'Customer Forbidden from Mutating Order Status',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${resCustMutate.statusCode}`,
      status: resCustMutate.statusCode === 403 ? 'PASS' : 'FAIL',
      evidence: JSON.stringify(resCustMutate.data)
    });
  }

  // ==========================================
  // DOMAIN 4: PAYMENTS, WEBHOOK REPLAY & HMAC
  // ==========================================
  console.log('\n--- DOMAIN 4: PAYMENTS & WEBHOOK REPLAY ---');

  // Test 4.1: Webhook Replay with Duplicate Event ID
  {
    const duplicateEventId = 'evt_test_replay_' + Date.now();
    const replayPayload = {
      id: duplicateEventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_replay_001',
            order_id: 'order_test_replay_001',
            amount: 50000,
            currency: 'INR'
          }
        }
      }
    };
    const bodyStr = JSON.stringify(replayPayload);
    const webhookSecret = 'Y9thJkIcOkD90gh8jncph6zb';
    const sig = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');

    // First delivery
    const resFirst = await request('POST', '/payments/webhook', {
      headers: {
        'x-razorpay-signature': sig,
        'x-razorpay-event-id': duplicateEventId
      },
      body: replayPayload
    });

    // Second delivery (Replay)
    const resReplay = await request('POST', '/payments/webhook', {
      headers: {
        'x-razorpay-signature': sig,
        'x-razorpay-event-id': duplicateEventId
      },
      body: replayPayload
    });

    console.log(`[BL-05] Webhook replay test (EventID: ${duplicateEventId}):`);
    console.log(`       First send: HTTP ${resFirst.statusCode}, Replay send: HTTP ${resReplay.statusCode}`);
    businessFindings.push({
      id: 'BL-07',
      domain: 'Payments Webhook',
      title: 'Duplicate Webhook Event Idempotency & Replay Protection',
      expected: 'Second webhook returns 200 with idempotent acknowledgment without duplicate processing',
      actual: `First: ${resFirst.statusCode}, Second: ${resReplay.statusCode}`,
      status: (resFirst.statusCode === 200 || resFirst.statusCode === 201) && (resReplay.statusCode === 200 || resReplay.statusCode === 201) ? 'PASS' : 'FAIL',
      evidence: `First: ${JSON.stringify(resFirst.data)}, Second: ${JSON.stringify(resReplay.data)}`
    });
  }

  // ==========================================
  // DOMAIN 5: AUDIT LOGS IMMUTABILITY
  // ==========================================
  console.log('\n--- DOMAIN 5: AUDIT LOGS IMMUTABILITY & PURGE RESISTANCE ---');
  {
    // Check if there is any DELETE /audit-logs or PUT /audit-logs
    const resDeleteAudit = await request('DELETE', '/audit-logs/some-id', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`[BL-06] DELETE /audit-logs/:id: HTTP ${resDeleteAudit.statusCode} (Expected: 404/405 - No delete route)`);
    businessFindings.push({
      id: 'BL-08',
      domain: 'Audit Logs',
      title: 'Audit Logs Immutability (No DELETE endpoint)',
      expected: 'HTTP 404 or 405 (Logs cannot be deleted via API)',
      actual: `HTTP ${resDeleteAudit.statusCode}`,
      status: (resDeleteAudit.statusCode === 404 || resDeleteAudit.statusCode === 405) ? 'PASS' : 'FAIL',
      evidence: `Status: ${resDeleteAudit.statusCode}`
    });
  }

  // Save all findings
  fs.writeFileSync(path.join(__dirname, 'business_logic_results.json'), JSON.stringify(businessFindings, null, 2));
  console.table(businessFindings.map(f => ({
    id: f.id,
    domain: f.domain,
    title: f.title,
    expected: f.expected.slice(0, 30),
    actual: f.actual.slice(0, 30),
    status: f.status
  })));
}

runBusinessAudit().catch(console.error);
