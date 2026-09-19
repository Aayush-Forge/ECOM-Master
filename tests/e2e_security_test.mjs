/**
 * End-to-End Backend Security & Role Enforcement Test
 *
 * Runs against the live NestJS backend server (or boots a temporary instance).
 * Verifies:
 * 1. Global Fail-Closed Guard (APP_GUARD)
 * 2. Public Endpoint Whitelist (@Public)
 * 3. Prevention of Privilege Escalation on Registration
 * 4. Admin-Only Staff Account Provisioning (POST /admin/users)
 * 5. Role Hierarchy & Endpoint Permission Matrix for all 4 roles
 */

import http from 'http';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function request(method, path, body = null, token = null) {
  const url = `${BACKEND_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 'ERROR', ok: false, error: err.message };
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log(' E2E SUITE 1: Backend Health & Public Endpoints (@Public)');
  console.log('===============================================================');

  // 1A. Health Check
  const health = await request('GET', '/');
  assert(health.status === 200, 'GET / (Root health) is public and returns HTTP 200');

  // 1B. Public Registration
  const testEmail = `e2e_cust_${Date.now()}@example.com`;
  const reg = await request('POST', '/auth/register', {
    email: testEmail,
    password: 'password123',
    firstName: 'E2E',
    lastName: 'Customer',
    role: 'admin', // Malicious attempt to escalate role to admin
  });
  assert(reg.status === 201 || reg.status === 200, 'POST /auth/register succeeds without token');
  assert(reg.data?.user?.role === 'customer', 'SECURITY: Forced customer role on registration (attacker payload role="admin" ignored)');
  assert(reg.data?.access_token, 'Registration returns valid access_token');

  // 1C. Public Login
  const loginCust = await request('POST', '/auth/login', {
    email: 'customer@sridattam.com',
    password: 'password123',
  });
  assert(loginCust.status === 200 || loginCust.status === 201, 'POST /auth/login for customer returns HTTP 200/201');
  const customerToken = loginCust.data?.access_token;
  assert(customerToken, 'Customer token issued');

  const loginViewer = await request('POST', '/auth/login', {
    email: 'viewer@sridattam.com',
    password: 'password123',
  });
  const viewerToken = loginViewer.data?.access_token;
  assert(viewerToken, 'Viewer token issued (role: read_only)');

  const loginEditor = await request('POST', '/auth/login', {
    email: 'editor@sridattam.com',
    password: 'password123',
  });
  const editorToken = loginEditor.data?.access_token;
  assert(editorToken, 'Editor token issued (role: editor)');

  const loginAdmin = await request('POST', '/auth/login', {
    email: 'admin@sridattam.com',
    password: 'password123',
  });
  const adminToken = loginAdmin.data?.access_token;
  assert(adminToken, 'Admin token issued (role: admin)');

  console.log('\n===============================================================');
  console.log(' E2E SUITE 2: Fail-Closed Security & Unauthorized Block Checks');
  console.log('===============================================================');

  // 2A. Unauthenticated requests to protected routes
  const noAuthAudit = await request('GET', '/audit-logs');
  assert(noAuthAudit.status === 401 || noAuthAudit.status === 403, 'GET /audit-logs without token returns 401/403');

  const noAuthUsers = await request('GET', '/admin/users');
  assert(noAuthUsers.status === 401 || noAuthUsers.status === 403, 'GET /admin/users without token returns 401/403');

  const noAuthMutations = await request('POST', '/test-mutations/products', { title: 'Hacked' });
  assert(noAuthMutations.status === 401 || noAuthMutations.status === 403, 'POST /test-mutations/products without token returns 401/403');

  console.log('\n===============================================================');
  console.log(' E2E SUITE 3: Role-Based Authorization Matrix');
  console.log('===============================================================');

  // 3A. Customer Role Checks
  const custAudit = await request('GET', '/audit-logs', null, customerToken);
  assert(custAudit.status === 403, 'Customer calling GET /audit-logs is rejected (HTTP 403)');

  const custUsers = await request('GET', '/admin/users', null, customerToken);
  assert(custUsers.status === 403, 'Customer calling GET /admin/users is rejected (HTTP 403)');

  const custProductMut = await request('POST', '/test-mutations/products', { title: 'Test' }, customerToken);
  assert(custProductMut.status === 403, 'Customer calling POST /test-mutations/products is rejected (HTTP 403)');

  const custOrderStatus = await request('PATCH', '/test-mutations/orders/123/status', { status: 'shipped' }, customerToken);
  assert(custOrderStatus.status === 403, 'Customer calling PATCH /test-mutations/orders/123/status is rejected (HTTP 403)');

  // 3B. Viewer (read_only) Role Checks
  const viewerAudit = await request('GET', '/audit-logs', null, viewerToken);
  assert(viewerAudit.status === 403, 'Viewer calling GET /audit-logs is rejected (HTTP 403)');

  const viewerUsers = await request('GET', '/admin/users', null, viewerToken);
  assert(viewerUsers.status === 403, 'Viewer calling GET /admin/users is rejected (HTTP 403)');

  const viewerProdCreate = await request('POST', '/test-mutations/products', { title: 'Test' }, viewerToken);
  assert(viewerProdCreate.status === 403, 'Viewer calling POST /test-mutations/products is rejected (HTTP 403)');

  const viewerDiscountCreate = await request('POST', '/test-mutations/discounts', { name: 'Disc' }, viewerToken);
  assert(viewerDiscountCreate.status === 403, 'Viewer calling POST /test-mutations/discounts is rejected (HTTP 403)');

  const viewerRefund = await request('POST', '/test-mutations/orders/123/refund', { amount: 500 }, viewerToken);
  assert(viewerRefund.status === 403, 'Viewer calling POST /test-mutations/orders/123/refund is rejected (HTTP 403)');

  const viewerOrderStatus = await request('PATCH', '/test-mutations/orders/123/status', { status: 'processing' }, viewerToken);
  assert(viewerOrderStatus.status === 200, 'Viewer calling PATCH /test-mutations/orders/123/status is ALLOWED (HTTP 200)');

  // 3C. Editor Role Checks
  const editorAudit = await request('GET', '/audit-logs', null, editorToken);
  assert(editorAudit.status === 403, 'Editor calling GET /audit-logs is rejected (HTTP 403)');

  const editorUsers = await request('GET', '/admin/users', null, editorToken);
  assert(editorUsers.status === 403, 'Editor calling GET /admin/users is rejected (HTTP 403)');

  const editorUserRolePatch = await request('PATCH', '/test-mutations/users/123/role', { role: 'admin' }, editorToken);
  assert(editorUserRolePatch.status === 403, 'Editor calling PATCH /test-mutations/users/123/role is rejected (HTTP 403)');

  const editorProdDelete = await request('DELETE', '/test-mutations/products/123', null, editorToken);
  assert(editorProdDelete.status === 403, 'Editor calling DELETE /test-mutations/products/123 (admin-only) is rejected (HTTP 403)');

  const editorProdCreate = await request('POST', '/test-mutations/products', { title: 'Incense' }, editorToken);
  assert(editorProdCreate.status === 201 || editorProdCreate.status === 200, 'Editor calling POST /test-mutations/products is ALLOWED (HTTP 201/200)');

  const editorProdPrice = await request('PUT', '/test-mutations/products/123/price', { basePrice: 599 }, editorToken);
  assert(editorProdPrice.status === 200, 'Editor calling PUT /test-mutations/products/123/price is ALLOWED (HTTP 200)');

  const editorDiscount = await request('POST', '/test-mutations/discounts', { name: 'Diwali 20' }, editorToken);
  assert(editorDiscount.status === 201 || editorDiscount.status === 200, 'Editor calling POST /test-mutations/discounts is ALLOWED (HTTP 201/200)');

  const editorRefund = await request('POST', '/test-mutations/orders/123/refund', { amount: 299 }, editorToken);
  assert(editorRefund.status === 201 || editorRefund.status === 200, 'Editor calling POST /test-mutations/orders/123/refund is ALLOWED (HTTP 201/200)');

  // 3D. Admin Role Checks (Full Access)
  const adminAudit = await request('GET', '/audit-logs', null, adminToken);
  assert(adminAudit.status === 200, 'Admin calling GET /audit-logs is ALLOWED (HTTP 200)');

  const adminUsers = await request('GET', '/admin/users', null, adminToken);
  assert(adminUsers.status === 200, 'Admin calling GET /admin/users is ALLOWED (HTTP 200)');

  const adminProdDelete = await request('DELETE', '/test-mutations/products/123', null, adminToken);
  assert(adminProdDelete.status === 200, 'Admin calling DELETE /test-mutations/products/123 is ALLOWED (HTTP 200)');

  const adminUserRole = await request('PATCH', '/test-mutations/users/123/role', { role: 'editor' }, adminToken);
  assert(adminUserRole.status === 200, 'Admin calling PATCH /test-mutations/users/123/role is ALLOWED (HTTP 200)');

  console.log('\n===============================================================');
  console.log(' E2E SUITE 4: Admin-Only Staff Account Provisioning');
  console.log('===============================================================');

  const newStaffEmail = `provisioned_editor_${Date.now()}@sridattam.com`;
  const provisionRes = await request('POST', '/admin/users', {
    email: newStaffEmail,
    password: 'password123',
    firstName: 'Provisioned',
    lastName: 'Editor',
    role: 'editor',
  }, adminToken);
  assert(provisionRes.status === 201 || provisionRes.status === 200, 'Admin calling POST /admin/users succeeds (HTTP 201/200)');
  assert(provisionRes.data?.role === 'editor', 'Provisioned account assigned role="editor"');

  // Verify the provisioned editor can log in and has editor privileges
  const staffLogin = await request('POST', '/auth/login', {
    email: newStaffEmail,
    password: 'password123',
  });
  assert(staffLogin.data?.user?.role === 'editor', 'Provisioned editor logs in with role="editor"');
  const staffToken = staffLogin.data?.access_token;
  const staffProdCreate = await request('POST', '/test-mutations/products', { title: 'Staff Product' }, staffToken);
  assert(staffProdCreate.status === 201 || staffProdCreate.status === 200, 'Provisioned editor can call editor mutation endpoint');

  // Verify non-admins cannot provision accounts
  const unauthorizedProvision = await request('POST', '/admin/users', {
    email: `fake_${Date.now()}@sridattam.com`,
    password: 'password123',
    firstName: 'Fake',
    lastName: 'Admin',
    role: 'admin',
  }, editorToken);
  assert(unauthorizedProvision.status === 403, 'Editor calling POST /admin/users is REJECTED (HTTP 403)');

  console.log('\n===============================================================');
  console.log(` E2E TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Start temporary backend server if not running, then execute tests
async function main() {
  // Test connection to backend
  try {
    const res = await fetch(`${BACKEND_URL}/`);
    console.log(`Connected to backend on ${BACKEND_URL}`);
    await runTests();
  } catch (err) {
    console.log(`Backend is not currently running on ${BACKEND_URL}. Starting test runner...`);
    console.error(err.message);
    process.exit(1);
  }
}

main();
