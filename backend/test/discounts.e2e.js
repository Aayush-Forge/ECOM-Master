/**
 * Coupon Usage Limit & Order Integration E2E Test Suite
 * Run: node backend/test/discounts.e2e.js
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sridattam.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

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

async function loginAdmin() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function run() {
  console.log('--- Starting Coupon Usage Limit E2E Test Suite ---');
  const token = await loginAdmin();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const testCouponName = `TEST_LIMIT_${Date.now()}`;
  let ruleId = null;
  let createdOrderId = null;

  try {
    // 1. Create a coupon with usageLimit = 1
    console.log('\n--- Test 1: Create Coupon with Usage Limit 1 ---');
    const createRes = await fetch(`${BASE_URL}/clubbing-rules`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: testCouponName,
        type: 'percentage_off_bundle',
        requiredQuantity: 1,
        percentageOff: 10,
        usageLimit: 1,
        isActive: true,
      }),
    });
    assert(createRes.status === 201, `Create coupon returned 201: got ${createRes.status}`);
    const createdRule = await createRes.json();
    ruleId = createdRule.id;
    assert(createdRule.usageLimit === 1, `usageLimit is 1: got ${createdRule.usageLimit}`);
    assert(createdRule.usageCount === 0, `initial usageCount is 0: got ${createdRule.usageCount}`);

    // Fetch existing simple product for order placement
    const productsRes = await fetch(`${BASE_URL}/all-products`);
    assert(productsRes.ok, 'Fetch all-products OK');
    const productsData = await productsRes.json();
    const productList = productsData.data || productsData;
    const product = productList.find((p) => p.type === 'simple' || !p.variationsData || p.variationsData.length === 0);
    assert(!!product, 'Found simple test product for order');

    // 2. Order 1 with coupon: Should succeed and atomically increment usage_count to 1
    console.log('\n--- Test 2: Apply Coupon First Time (Usage 0 -> 1) ---');
    const orderPayload = {
      items: [
        {
          productId: product.id,
          quantity: 1,
        },
      ],
      couponCode: testCouponName,
      shippingAddress: {
        fullName: 'Test Buyer',
        phone: '9876543210',
        addressLine1: 'Test St',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
      },
    };

    const order1Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    if (order1Res.status !== 201) {
      console.error('Order 1 failed with body:', await order1Res.text());
    }
    assert(order1Res.status === 201, `Order 1 created successfully: got ${order1Res.status}`);
    const order1 = await order1Res.json();
    createdOrderId = order1.id;
    assert(order1.couponCode === testCouponName, `Order stores couponCode: ${order1.couponCode}`);

    // Verify usageCount incremented in DB
    const checkRule1 = await (await fetch(`${BASE_URL}/clubbing-rules/${ruleId}`, { headers: authHeaders })).json();
    assert(checkRule1.usageCount === 1, `usageCount incremented to 1: got ${checkRule1.usageCount}`);

    // 3. Order 2 with coupon: Limit reached (1/1) -> Must be rejected with 400
    console.log('\n--- Test 3: Apply Coupon When Limit Reached (Must Reject with 400) ---');
    const order2Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    assert(order2Res.status === 400, `Exhausted coupon rejected with 400: got ${order2Res.status}`);
    const errBody = await order2Res.json();
    console.log('400 response body:', errBody);
    assert(
      errBody.message?.includes('usage limit') || errBody.message?.includes('invalid'),
      `Error mentions limit: ${errBody.message}`,
    );

    // 4. Cancel Order 1 -> Should release usage_count back to 0
    console.log('\n--- Test 4: Cancel Order Releases Coupon Usage Count ---');
    const cancelRes = await fetch(`${BASE_URL}/admin/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        toStatus: 'cancelled',
        note: 'Customer requested cancellation',
      }),
    });
    assert(cancelRes.status === 200, `Order cancelled successfully: got ${cancelRes.status}`);

    const checkRule2 = await (await fetch(`${BASE_URL}/clubbing-rules/${ruleId}`, { headers: authHeaders })).json();
    assert(checkRule2.usageCount === 0, `usageCount released back to 0: got ${checkRule2.usageCount}`);

    // 5. Order 3 with coupon: Should succeed again since coupon was released
    console.log('\n--- Test 5: Re-applying Released Coupon Succeeds ---');
    const order3Res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    assert(order3Res.status === 201, `Order 3 succeeded after release: got ${order3Res.status}`);
    const order3 = await order3Res.json();

    // Clean up order 3
    if (order3.id) {
      await fetch(`${BASE_URL}/admin/orders/${order3.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          toStatus: 'cancelled',
          note: 'Cleanup',
        }),
      }).catch(() => {});
    }

    console.log(`\n=========================================`);
    console.log(`ALL TESTS PASSED: ${testsPassed}/${testsPassed + testsFailed}`);
    console.log(`=========================================`);
  } finally {
    // Cleanup rule
    if (ruleId) {
      await fetch(`${BASE_URL}/clubbing-rules/${ruleId}`, {
        method: 'DELETE',
        headers: authHeaders,
      }).catch(() => {});
    }
  }
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
