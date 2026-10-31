const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const results = {
  summary: { total: 0, passed: 0, failed: 0, blocked: 0 },
  authMatrix: [],
  securityChecks: [],
  businessLogic: [],
  findings: []
};

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
      timeout: options.timeout || 5000
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

// Simple Base64URL encode for JWT crafting
function b64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function craftJwt(payload, secret, header = { alg: 'HS256', typ: 'JWT' }) {
  const encHeader = b64url(JSON.stringify(header));
  const encPayload = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${encHeader}.${encPayload}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encHeader}.${encPayload}.${sig}`;
}

async function run() {
  console.log('--- STARTING COMPREHENSIVE BACKEND AUDIT ---');

  // Step 1: Obtain tokens for all roles
  console.log('\n1. Authenticating test users...');
  const roles = [
    { role: 'admin', email: 'admin@sridattam.com', pass: 'password123' },
    { role: 'editor', email: 'editor@sridattam.com', pass: 'password123' },
    { role: 'read_only', email: 'read_only@sridattam.com', pass: 'password123' },
    { role: 'customer', email: 'customer@sridattam.com', pass: 'password123' },
  ];

  const tokens = {};
  const userDetails = {};

  for (const r of roles) {
    try {
      const res = await request('POST', '/auth/login', {
        body: { email: r.email, password: r.pass }
      });
      const token = res.data?.access_token || res.data?.accessToken;
      const refToken = res.data?.refresh_token || res.data?.refreshToken;
      if ((res.statusCode === 200 || res.statusCode === 201) && token) {
        tokens[r.role] = token;
        tokens[`${r.role}_refresh`] = refToken;
        userDetails[r.role] = res.data.user;
        console.log(`[PASS] Logged in as ${r.role} (${r.email}) - UserID: ${res.data.user?.id}`);
      } else {
        console.error(`[FAIL] Login failed for ${r.role}: HTTP ${res.statusCode}`, res.data);
      }
    } catch (err) {
      console.error(`[ERROR] Login request failed for ${r.role}:`, err.message);
    }
  }

  // Step 1b: Craft Malicious & Invalid JWTs
  const validSecret = 'sridattam-dev-jwt-access-secret-key-2026';
  const wrongSecret = 'wrong-secret-key-12345678901234567890';
  const validAdminId = userDetails.admin?.id || 'edaee9ba-18f7-4844-9ec6-1c2e81312913';

  // Expired token (1 day ago)
  const expiredJwt = craftJwt({
    sub: validAdminId,
    email: 'admin@sridattam.com',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000) - 86400 * 2,
    exp: Math.floor(Date.now() / 1000) - 86400
  }, validSecret);

  // Wrong secret token
  const wrongSecretJwt = craftJwt({
    sub: validAdminId,
    email: 'admin@sridattam.com',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  }, wrongSecret);

  // Tampered signature token
  const tamperedJwt = tokens.admin ? tokens.admin.slice(0, -6) + 'xxxxxx' : 'invalid.tampered.token';

  // Refresh token used as access token
  const refreshAsAccessJwt = tokens.admin_refresh;

  console.log('\n--- TOKENS PREPARED ---');

  // Step 2: Test Specific Security Vulnerabilities & Known Flaws
  console.log('\n2. Testing Specific Security Invariants & Previous Audit Vulnerabilities...');

  // TEST 2.1: Payment Signature Exposure in /admin/payments
  {
    const res = await request('GET', '/admin/payments', {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    const leak = res.data && JSON.stringify(res.data).includes('razorpaySignature') && res.data.some?.(p => p.razorpaySignature);
    results.securityChecks.push({
      id: 'SEC-01',
      title: 'Payment Signature Leaked in Admin Payments API',
      status: leak ? 'FAIL' : 'PASS',
      evidence: `HTTP ${res.statusCode}, Contains razorpaySignature: ${leak}`,
      recommendation: 'Exclude razorpaySignature from response DTO/Prisma select.'
    });
    console.log(`[SEC-01] Payment Signature Leaked in /admin/payments: ${leak ? 'FAIL (LEAKED!)' : 'PASS'}`);
  }

  // TEST 2.2: Product Draft Leak via ?admin=true without Auth
  {
    const resPublic = await request('GET', '/products');
    const resWithParam = await request('GET', '/products?admin=true');
    const publicCount = resPublic.data?.products?.length || (Array.isArray(resPublic.data) ? resPublic.data.length : 0);
    const paramCount = resWithParam.data?.products?.length || (Array.isArray(resWithParam.data) ? resWithParam.data.length : 0);
    const leaked = paramCount > publicCount || (resWithParam.data?.products || []).some(p => p.status === 'draft' || p.status === 'archived');
    results.securityChecks.push({
      id: 'SEC-02',
      title: 'Draft/Archived Catalog Leaked to Unauthenticated Visitors via ?admin=true',
      status: leaked ? 'FAIL' : 'PASS',
      evidence: `Public count: ${publicCount}, ?admin=true count: ${paramCount}`,
      recommendation: 'Check req.user role before honoring admin=true query parameter.'
    });
    console.log(`[SEC-02] Catalog Draft Leak via ?admin=true: ${leaked ? 'FAIL (LEAKED!)' : 'PASS'} (Public: ${publicCount}, AdminParam: ${paramCount})`);
  }

  // TEST 2.3: Public Access to /admin/all-categories
  {
    const res = await request('GET', '/admin/all-categories');
    const isPublic = res.statusCode === 200;
    results.securityChecks.push({
      id: 'SEC-03',
      title: 'Unauthenticated Public Access to /admin/all-categories',
      status: isPublic ? 'FAIL' : 'PASS',
      evidence: `HTTP ${res.statusCode}`,
      recommendation: 'Apply @Roles(ROLES.READ_ONLY) and remove @Public() from admin/all-categories'
    });
    console.log(`[SEC-03] /admin/all-categories without auth: ${isPublic ? 'FAIL (PUBLIC ACCESSIBLE!)' : 'PASS'} (HTTP ${res.statusCode})`);
  }

  // TEST 2.4: Staff Email Leaked in Order Status History
  {
    const ordersRes = await request('GET', '/orders', {
      headers: { Authorization: `Bearer ${tokens.admin}` }
    });
    const orders = ordersRes.data?.orders || ordersRes.data || [];
    let emailLeaked = false;
    let sampleLeak = null;
    if (Array.isArray(orders)) {
      for (const ord of orders.slice(0, 10)) {
        if (ord.statusHistory?.some(h => h.changedByUser?.email)) {
          emailLeaked = true;
          sampleLeak = ord.statusHistory.find(h => h.changedByUser?.email);
          break;
        }
      }
    }
    results.securityChecks.push({
      id: 'SEC-04',
      title: 'Staff Email Leaked in Order Status History',
      status: emailLeaked ? 'FAIL' : 'PASS',
      evidence: emailLeaked ? `Found staff email in history: ${JSON.stringify(sampleLeak)}` : 'No email in history',
      recommendation: 'Omit email from changedByUser select.'
    });
    console.log(`[SEC-04] Staff Email in Order Status History: ${emailLeaked ? 'FAIL (LEAKED!)' : 'PASS'}`);
  }

  // TEST 2.5: CORS Policy Check
  {
    const resDisallowed = await request('OPTIONS', '/health', {
      headers: {
        Origin: 'http://malicious-attacker.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    const allowOrigin = resDisallowed.headers['access-control-allow-origin'];
    const corsPass = !allowOrigin || allowOrigin !== 'http://malicious-attacker.com';
    results.securityChecks.push({
      id: 'SEC-05',
      title: 'CORS Restricts Untrusted Origins',
      status: corsPass ? 'PASS' : 'FAIL',
      evidence: `Origin: http://malicious-attacker.com -> Access-Control-Allow-Origin: ${allowOrigin || 'none'}`,
      recommendation: 'Maintain strict origin allowlist.'
    });
    console.log(`[SEC-05] CORS Disallowed Origin: ${corsPass ? 'PASS' : 'FAIL'} (Header: ${allowOrigin})`);
  }

  // TEST 2.6: Security Headers (Helmet)
  {
    const res = await request('GET', '/health');
    const h = res.headers;
    const hasXFrame = !!h['x-frame-options'];
    const hasXContent = !!h['x-content-type-options'];
    const hasXPoweredBy = !!h['x-powered-by'];
    const secHeadersPass = hasXFrame && hasXContent && !hasXPoweredBy;
    results.securityChecks.push({
      id: 'SEC-06',
      title: 'Security Headers Present & X-Powered-By Stripped',
      status: secHeadersPass ? 'PASS' : 'FAIL',
      evidence: `X-Frame-Options: ${h['x-frame-options']}, X-Content-Type-Options: ${h['x-content-type-options']}, X-Powered-By: ${h['x-powered-by'] || 'hidden'}`,
      recommendation: 'Ensure helmet is properly enabled.'
    });
    console.log(`[SEC-06] Security Headers: ${secHeadersPass ? 'PASS' : 'FAIL'} (X-Frame: ${h['x-frame-options']}, X-Content-Type: ${h['x-content-type-options']}, X-Powered-By: ${h['x-powered-by'] || 'none'})`);
  }

  // TEST 2.7: Webhook Signature Verification
  {
    const samplePayload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_dummy_123', order_id: 'order_dummy_123', amount: 50000 } } }
    };
    const bodyStr = JSON.stringify(samplePayload);
    const validWebhookSig = crypto.createHmac('sha256', 'Y9thJkIcOkD90gh8jncph6zb').update(bodyStr).digest('hex');

    // 2.7a Missing signature
    const resMissing = await request('POST', '/payments/webhook', {
      body: samplePayload
    });

    // 2.7b Invalid signature
    const resInvalid = await request('POST', '/payments/webhook', {
      headers: { 'x-razorpay-signature': 'invalid_signature_hex_12345' },
      body: samplePayload
    });

    const webhookSecPass = resMissing.statusCode === 400 && resInvalid.statusCode === 400;
    results.securityChecks.push({
      id: 'SEC-07',
      title: 'Webhook Signature Enforcement',
      status: webhookSecPass ? 'PASS' : 'FAIL',
      evidence: `Missing sig status: ${resMissing.statusCode}, Invalid sig status: ${resInvalid.statusCode}`,
      recommendation: 'Reject unsigned or invalid webhook payloads with 400.'
    });
    console.log(`[SEC-07] Webhook Signature Enforcement: ${webhookSecPass ? 'PASS' : 'FAIL'} (Missing: ${resMissing.statusCode}, Invalid: ${resInvalid.statusCode})`);
  }

  // TEST 2.8: SQL Injection / Bad Input Handling
  {
    const resSql = await request('GET', "/products?search=' OR '1'='1");
    const sqlPass = resSql.statusCode === 200 || resSql.statusCode === 400;
    const resXss = await request('POST', '/auth/login', {
      body: { email: "<script>alert('xss')</script>@test.com", password: 'password123' }
    });
    const xssPass = resXss.statusCode === 400 || resXss.statusCode === 401;
    results.securityChecks.push({
      id: 'SEC-08',
      title: 'SQL Injection & Malformed Input Handling',
      status: (sqlPass && xssPass) ? 'PASS' : 'FAIL',
      evidence: `Search with SQL injection: HTTP ${resSql.statusCode}, Login with XSS email: HTTP ${resXss.statusCode}`,
      recommendation: 'Validate all inputs with class-validator.'
    });
    console.log(`[SEC-08] SQL / XSS Input Resilience: ${sqlPass && xssPass ? 'PASS' : 'FAIL'}`);
  }

  // TEST 2.9: IDOR / Access Control - Customer A mutating Customer B's resources
  {
    // Let's create an address for Customer or check addresses
    const custRes = await request('GET', '/addresses', {
      headers: { Authorization: `Bearer ${tokens.customer}` }
    });
    let idorTested = false;
    let idorPass = true;
    let idorEvidence = 'No secondary customer address available to mutate.';

    if (custRes.statusCode === 200 && Array.isArray(custRes.data) && custRes.data.length > 0) {
      const addressId = custRes.data[0].id;
      // Try to mutate or delete using read_only staff or another customer
      const resTamper = await request('DELETE', `/addresses/${addressId}`, {
        headers: { Authorization: `Bearer ${tokens.read_only}` }
      });
      // read_only role does not have customer role rank or ownership, expect 403 or 404
      idorPass = resTamper.statusCode === 403 || resTamper.statusCode === 404;
      idorEvidence = `Read-only user deleting customer address ${addressId} -> HTTP ${resTamper.statusCode}`;
      idorTested = true;
    }
    results.securityChecks.push({
      id: 'SEC-09',
      title: 'IDOR Prevention on Customer Resources',
      status: idorPass ? 'PASS' : 'FAIL',
      evidence: idorEvidence,
      recommendation: 'Enforce user ownership checks on all customer entity mutations.'
    });
    console.log(`[SEC-09] IDOR Protection: ${idorPass ? 'PASS' : 'FAIL'} (${idorEvidence})`);
  }

  // Step 3: Auth Matrix over Representative Routes
  console.log('\n3. Testing Auth Matrix Across Sample Critical Routes...');
  const testRoutes = [
    { method: 'GET', path: '/health', minRole: 'public' },
    { method: 'GET', path: '/products', minRole: 'public' },
    { method: 'GET', path: '/categories', minRole: 'public' },
    { method: 'GET', path: '/orders', minRole: 'public' },
    { method: 'GET', path: '/admin/orders', minRole: 'read_only' },
    { method: 'GET', path: '/admin/payments', minRole: 'read_only' },
    { method: 'GET', path: '/admin/users', minRole: 'admin' },
    { method: 'POST', path: '/admin/users', minRole: 'admin' },
    { method: 'GET', path: '/audit-logs', minRole: 'admin' },
    { method: 'GET', path: '/admin/company-profile', minRole: 'admin' },
    { method: 'GET', path: '/admin/accounting/summary', minRole: 'read_only' },
    { method: 'GET', path: '/shipping-templates', minRole: 'read_only' },
    { method: 'POST', path: '/shipping-templates', minRole: 'editor' },
    { method: 'GET', path: '/admin/customers', minRole: 'admin' },
    { method: 'GET', path: '/reviews/products-summary', minRole: 'editor' },
    { method: 'GET', path: '/orders/me', minRole: 'customer' },
  ];

  const authScenarios = [
    { name: 'Unauthenticated', token: null },
    { name: 'Expired JWT', token: expiredJwt },
    { name: 'Tampered JWT', token: tamperedJwt },
    { name: 'Wrong Secret JWT', token: wrongSecretJwt },
    { name: 'Refresh Token as Access Token', token: refreshAsAccessJwt },
    { name: 'Customer Role', token: tokens.customer },
    { name: 'Read-Only Role', token: tokens.read_only },
    { name: 'Editor Role', token: tokens.editor },
    { name: 'Admin Role', token: tokens.admin },
  ];

  for (const r of testRoutes) {
    const routeRecord = { endpoint: `${r.method} ${r.path}`, minRole: r.minRole || 'public', scenarios: {} };

    for (const sc of authScenarios) {
      const headers = {};
      if (sc.token) headers['Authorization'] = `Bearer ${sc.token}`;

      try {
        const res = await request(r.method, r.path, { headers });
        routeRecord.scenarios[sc.name] = res.statusCode;
      } catch (err) {
        routeRecord.scenarios[sc.name] = 'ERR: ' + err.message;
      }
    }
    results.authMatrix.push(routeRecord);
  }

  console.table(results.authMatrix.map(r => ({
    endpoint: r.endpoint,
    Unauth: r.scenarios['Unauthenticated'],
    Expired: r.scenarios['Expired JWT'],
    Tampered: r.scenarios['Tampered JWT'],
    WrongSec: r.scenarios['Wrong Secret JWT'],
    RefreshAsAcc: r.scenarios['Refresh Token as Access Token'],
    Customer: r.scenarios['Customer Role'],
    ReadOnly: r.scenarios['Read-Only Role'],
    Editor: r.scenarios['Editor Role'],
    Admin: r.scenarios['Admin Role'],
  })));

  // Write out results
  fs.writeFileSync(path.join(__dirname, 'backend_test_results.json'), JSON.stringify(results, null, 2));
  console.log('\nBackend test run complete. Results saved to audit/backend_test_results.json');
}

run().catch(console.error);
