import assert from 'node:assert';

const BACKEND_URL = 'http://localhost:5000';
const STOREFRONT_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting Maintenance Mode End-to-End Tests ---');

  // 1. Check default site status (must be isMaintenance: false)
  console.log('1. Checking initial public site status...');
  const initRes = await fetch(`${BACKEND_URL}/site-status`);
  assert.strictEqual(initRes.status, 200, 'Initial status endpoint should return 200');
  const initData = await initRes.json();
  console.log('   Initial data:', initData);
  assert.strictEqual(typeof initData.isMaintenance, 'boolean');

  // 2. Admin login to get JWT
  console.log('2. Logging in as admin...');
  const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@sridattam.com',
      password: 'password123',
    }),
  });
  assert.ok(loginRes.status === 200 || loginRes.status === 201, 'Admin login should succeed');
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.accessToken;
  assert.ok(token, 'Access token must be present');

  // 3. Toggle maintenance ON with custom notice
  console.log('3. Toggling maintenance ON as admin...');
  const customNotice = 'Scheduled Catalog Upgrade in Progress.';
  const patchOnRes = await fetch(`${BACKEND_URL}/admin/site-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      isMaintenance: true,
      message: customNotice,
    }),
  });
  assert.strictEqual(patchOnRes.status, 200, 'Toggling maintenance ON should succeed');
  const patchOnData = await patchOnRes.json();
  assert.strictEqual(patchOnData.isMaintenance, true);
  assert.strictEqual(patchOnData.message, customNotice);

  // 4. Test backend guard on cart creation
  console.log('4. Verifying cart creation returns 503 during maintenance...');
  const cartRes = await fetch(`${BACKEND_URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(cartRes.status, 503, 'Cart creation should be blocked with 503');
  const cartErr = await cartRes.json();
  console.log('   Cart 503 payload:', cartErr);
  assert.strictEqual(cartErr.statusCode, 503);
  assert.strictEqual(cartErr.message, customNotice);

  // 5. Test razorpay webhook is NOT blocked
  console.log('5. Verifying Razorpay webhook endpoint is NOT blocked by maintenance...');
  const webhookRes = await fetch(`${BACKEND_URL}/webhooks/razorpay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'dummy' }),
  });
  // Webhook will fail signature validation (400) or process, but NEVER 503
  assert.notStrictEqual(webhookRes.status, 503, 'Webhook must not be blocked by maintenance');

  // 6. Test Storefront Middleware rewrites with 503
  console.log('6. Verifying Storefront responds with 503 during maintenance...');
  // Note: in-memory cache may take up to 15s to expire if previously hit, wait 16s if needed
  let sfRes = await fetch(STOREFRONT_URL);
  if (sfRes.status !== 503) {
    console.log('   Waiting 16s for storefront middleware in-memory cache to refresh...');
    await new Promise((r) => setTimeout(r, 16000));
    sfRes = await fetch(STOREFRONT_URL);
  }
  assert.strictEqual(sfRes.status, 503, 'Storefront should return 503 Service Unavailable');
  const sfHtml = await sfRes.text();
  assert.ok(sfHtml.includes('Under Maintenance'), 'Storefront response should contain maintenance header');
  console.log('   Storefront returned 503 and maintenance page correctly.');

  // 7. Toggle maintenance OFF
  console.log('7. Toggling maintenance OFF...');
  const patchOffRes = await fetch(`${BACKEND_URL}/admin/site-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      isMaintenance: false,
      message: null,
    }),
  });
  assert.strictEqual(patchOffRes.status, 200, 'Toggling maintenance OFF should succeed');
  const patchOffData = await patchOffRes.json();
  assert.strictEqual(patchOffData.isMaintenance, false);

  // 8. Verify cart operations resume
  console.log('8. Verifying cart operations succeed after toggle OFF...');
  const cartResAfter = await fetch(`${BACKEND_URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(cartResAfter.status, 201, 'Cart creation should succeed (201) when maintenance is off');

  console.log('\n--- ALL MAINTENANCE MODE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
