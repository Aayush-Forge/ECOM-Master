/**
 * Comprehensive Coupon & Bundle Stacking Integration Test
 * Run: node tests/coupon_bundle_integration_test.mjs
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sridattam.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✅ PASS: ${msg}`);
    passed++;
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
  console.log('\n===============================================================');
  console.log(' COUPON & BUNDLE STACKING INTEGRATION TEST SUITE');
  console.log('===============================================================');

  const token = await loginAdmin();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Fetch available products
  const productsRes = await fetch(`${BASE_URL}/all-products`);
  assert(productsRes.ok, 'Fetched all products');
  const prodsData = await productsRes.json();
  const products = (prodsData.data || prodsData).slice(0, 3);
  assert(products.length >= 3, `Found ${products.length} test products`);

  const p1 = products[0];
  const p2 = products[1];
  const p3 = products[2];

  const price1 = Number(p1.salePrice || p1.basePrice || 200);
  const price2 = Number(p2.salePrice || p2.basePrice || 200);
  const price3 = Number(p3.salePrice || p3.basePrice || 200);
  const totalBasePrice = price1 + price2 + price3;

  const cartItems = [
    { productId: p1.id, quantity: 1, price: price1 },
    { productId: p2.id, quantity: 1, price: price2 },
    { productId: p3.id, quantity: 1, price: price3 },
  ];

  let testBundleRuleId = null;
  let testCouponRuleId = null;

  try {
    // 2. Create an automatic volume bundle (no coupon code, buy 3 for 20% off)
    const bundleName = `TEST_AUTO_BUNDLE_${Date.now()}`;
    const createBundleRes = await fetch(`${BASE_URL}/clubbing-rules`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: bundleName,
        type: 'percentage_off_bundle',
        requiredQuantity: 3,
        percentageOff: 20,
        applicableProductIds: [p1.id, p2.id, p3.id],
        isActive: true,
      }),
    });
    assert(createBundleRes.status === 201, 'Created automatic bundle rule');
    const createdBundle = await createBundleRes.json();
    testBundleRuleId = createdBundle.id;

    // 3. Test calculation WITHOUT any coupon:
    console.log('\n--- Test A: Automatic Bundle Applies to Cart ---');
    const calcNoCoupon = await (
      await fetch(`${BASE_URL}/clubbing-rules/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems }),
      })
    ).json();

    const expectedBundleDiscount = Math.round(totalBasePrice * 0.20 * 100) / 100;
    assert(calcNoCoupon.bundleDiscount > 0, `Bundle discount calculated: ₹${calcNoCoupon.bundleDiscount}`);
    assert(calcNoCoupon.discountTotal === calcNoCoupon.bundleDiscount, `Discount total matches bundle discount`);
    assert(calcNoCoupon.appliedCouponCode === null, 'No coupon code applied');

    // 4. Create a storewide promotional coupon (10% off with coupon code SAVE10)
    console.log('\n--- Test B: Create Storewide Promo Coupon ---');
    const couponCode = `SAVE10_${Date.now().toString().slice(-4)}`;
    const createCouponRes = await fetch(`${BASE_URL}/clubbing-rules`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Promo Coupon ${couponCode}`,
        code: couponCode,
        type: 'percentage_off_bundle',
        requiredQuantity: 1,
        percentageOff: 10,
        isActive: true,
      }),
    });
    assert(createCouponRes.status === 201, 'Created promo coupon');
    const createdCoupon = await createCouponRes.json();
    testCouponRuleId = createdCoupon.id;

    // 5. Test calculation WITH coupon on the bundle:
    console.log('\n--- Test C: Applying Coupon Code in Bundle (Amount Must Be Reduced!) ---');
    const calcWithCoupon = await (
      await fetch(`${BASE_URL}/clubbing-rules/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, couponCode }),
      })
    ).json();

    console.log('Result with coupon:', calcWithCoupon);
    assert(calcWithCoupon.appliedCouponCode === couponCode, `Coupon code "${couponCode}" applied successfully`);
    assert(calcWithCoupon.bundleDiscount > 0, `Bundle discount preserved: ₹${calcWithCoupon.bundleDiscount}`);
    assert(calcWithCoupon.couponDiscount > 0, `Coupon discount added: ₹${calcWithCoupon.couponDiscount}`);
    assert(
      calcWithCoupon.discountTotal > calcNoCoupon.discountTotal,
      `TOTAL AMOUNT IS REDUCED! ₹${calcNoCoupon.discountTotal} -> ₹${calcWithCoupon.discountTotal} (Savings increased by ₹${calcWithCoupon.couponDiscount})`
    );

    // 6. Test invalid coupon code
    console.log('\n--- Test D: Invalid Coupon Code Handling ---');
    const calcInvalid = await (
      await fetch(`${BASE_URL}/clubbing-rules/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, couponCode: 'TOTALLY_INVALID_999' }),
      })
    ).json();

    assert(calcInvalid.appliedCouponCode === null, 'Invalid coupon does NOT return appliedCouponCode');
    assert(calcInvalid.couponError === 'Invalid coupon code', `Returns helpful couponError: "${calcInvalid.couponError}"`);
    assert(calcInvalid.discountTotal === calcNoCoupon.discountTotal, 'Total discount falls back to bundle discount');

    // 7. Test Server Cart Integration (GET /cart/:id?couponCode=...)
    console.log('\n--- Test E: Server Cart API End-to-End ---');
    const cartRes = await fetch(`${BASE_URL}/cart`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const cart = await cartRes.json();
    assert(Boolean(cart?.id), 'Created server cart');

    // Add items to server cart
    for (const item of cartItems) {
      await fetch(`${BASE_URL}/cart/${cart.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cart-token': cart.token },
        body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
      });
    }

    // Fetch cart with coupon
    const cartWithCoupon = await (
      await fetch(`${BASE_URL}/cart/${cart.id}?couponCode=${couponCode}`, {
        headers: { 'x-cart-token': cart.token },
      })
    ).json();

    assert(cartWithCoupon.appliedCouponCode === couponCode, `Cart endpoint returns appliedCouponCode: ${cartWithCoupon.appliedCouponCode}`);
    assert(cartWithCoupon.discountTotal > 0, `Cart discountTotal is ₹${cartWithCoupon.discountTotal}`);
    assert(cartWithCoupon.grandTotal < cartWithCoupon.subtotal, `Grand total (₹${cartWithCoupon.grandTotal}) is strictly less than subtotal (₹${cartWithCoupon.subtotal})`);

    console.log('\n===============================================================');
    console.log(`ALL INTEGRATION TESTS PASSED: ${passed}/${passed + failed}`);
    console.log('===============================================================\n');
  } finally {
    if (testBundleRuleId) {
      await fetch(`${BASE_URL}/clubbing-rules/${testBundleRuleId}`, { method: 'DELETE', headers: authHeaders }).catch(() => {});
    }
    if (testCouponRuleId) {
      await fetch(`${BASE_URL}/clubbing-rules/${testCouponRuleId}`, { method: 'DELETE', headers: authHeaders }).catch(() => {});
    }
  }
}

run().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
