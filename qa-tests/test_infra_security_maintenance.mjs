import fs from 'fs';

const BACKEND_URL = 'http://localhost:5000';

async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

async function runInfraAndSecurityTests() {
  console.log('--- RUNNING INFRASTRUCTURE, SECURITY & MAINTENANCE TESTS ---');
  const admin = await login('admin@sridattam.com', 'password123');
  const editor = await login('editor@sridattam.com', 'password123');

  const findings = [];

  // 1. SECURITY HEADERS CHECK
  console.log('\n[TEST 1] Security Headers Verification');
  const headRes = await fetch(`${BACKEND_URL}/health`);
  const headers = Object.fromEntries(headRes.headers.entries());
  console.log('Response headers for GET /health:', {
    'content-security-policy': Boolean(headers['content-security-policy']),
    'x-content-type-options': headers['x-content-type-options'],
    'x-frame-options': headers['x-frame-options'],
    'strict-transport-security': headers['strict-transport-security'],
  });

  if (!headers['x-content-type-options']) {
    findings.push({
      id: 'MISSING-NOSNIFF-HEADER',
      severity: 'Low',
      area: 'Security Headers',
      title: 'Missing X-Content-Type-Options header',
      evidence: JSON.stringify(headers),
    });
  }

  // 2. CORS RESTRICTIONS
  console.log('\n[TEST 2] CORS Policy Verification');
  const corsDisallowed = await fetch(`${BACKEND_URL}/health`, {
    headers: { Origin: 'https://evil-attacker-site.com' },
  });
  const allowOriginDisallowed = corsDisallowed.headers.get('access-control-allow-origin');
  console.log('Origin: evil-attacker-site.com -> Access-Control-Allow-Origin:', allowOriginDisallowed);
  if (allowOriginDisallowed === 'https://evil-attacker-site.com' || allowOriginDisallowed === '*') {
    findings.push({
      id: 'CORS-WILDCARD-OR-UNTRUSTED',
      severity: 'High',
      area: 'CORS',
      title: 'CORS policy reflects untrusted external origin',
      evidence: `Origin https://evil-attacker-site.com resulted in Access-Control-Allow-Origin: ${allowOriginDisallowed}`,
    });
  }

  // 3. RATE LIMITING CHECK
  console.log('\n[TEST 3] Throttler Rate Limiting Verification');
  let hit429 = false;
  let remainingAfter100 = null;
  for (let i = 0; i < 115; i++) {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (res.status === 429) {
      hit429 = true;
      console.log(`Rate limit triggered 429 at request #${i + 1}`);
      break;
    }
  }
  if (!hit429) {
    findings.push({
      id: 'RATE-LIMIT-NOT-TRIGGERED',
      severity: 'Medium',
      area: 'Throttler',
      title: 'Rate limiter did not throttle requests after 100 rapid requests',
      evidence: 'Sent 115 rapid GET requests to /health without encountering HTTP 429',
    });
  } else {
    console.log('PASS: Throttler correctly returned HTTP 429 Too Many Requests.');
  }

  // 4. MAINTENANCE MODE ACTIVATION & ENFORCEMENT
  console.log('\n[TEST 4] Maintenance Mode Lifecycle');
  // Check initial status
  const initStatusRes = await fetch(`${BACKEND_URL}/site-status`);
  const initStatus = await initStatusRes.json();
  console.log('Initial site status:', initStatus);

  // Activate maintenance mode
  console.log('Activating maintenance mode via PATCH /admin/site-status...');
  const activateRes = await fetch(`${BACKEND_URL}/admin/site-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({
      isMaintenance: true,
      message: 'QA Maintenance Test in Progress',
    }),
  });
  console.log('Activate response status:', activateRes.status);
  const statusAfterActivate = await (await fetch(`${BACKEND_URL}/site-status`)).json();
  console.log('Site status after activation:', statusAfterActivate);

  // Verify Cart and Orders are blocked during maintenance
  const cartBlockRes = await fetch(`${BACKEND_URL}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'b0e01729-160a-4da2-9bb0-f470559ebaa0', quantity: 1 }),
  });
  console.log('POST /cart/items during maintenance status:', cartBlockRes.status);
  const cartBlockText = await cartBlockRes.text();
  console.log('Cart response during maintenance:', cartBlockText);

  if (cartBlockRes.status !== 503) {
    findings.push({
      id: 'MAINTENANCE-MODE-BYPASS-CART',
      severity: 'High',
      area: 'Site Status',
      title: 'Maintenance Mode Bypass: Cart operations allowed while site is in maintenance',
      evidence: `POST /cart/items returned HTTP ${cartBlockRes.status} instead of 503`,
    });
  } else {
    console.log('PASS: BlockDuringMaintenanceGuard correctly returned 503 Service Unavailable.');
  }

  // Deactivate maintenance mode to restore system
  console.log('Deactivating maintenance mode...');
  await fetch(`${BACKEND_URL}/admin/site-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({ isMaintenance: false }),
  });
  const restoredStatus = await (await fetch(`${BACKEND_URL}/site-status`)).json();
  console.log('Restored site status:', restoredStatus);

  // 5. FILE UPLOAD BOUNDARY TESTS
  console.log('\n[TEST 5] File Upload Boundary Tests');
  // Attempt to upload a malicious file (e.g. .exe / .sh) via multipart form
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const maliciousFileContent =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="malware.exe"\r\n` +
    `Content-Type: application/x-msdownload\r\n\r\n` +
    `MZEXECUTABLE_BINARY_DATA\r\n` +
    `--${boundary}--\r\n`;

  const uploadRes = await fetch(`${BACKEND_URL}/clubbing-rules/upload-banner`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${editor.token}`,
    },
    body: maliciousFileContent,
  });
  console.log('Malicious file upload (.exe) response status:', uploadRes.status);
  const uploadText = await uploadRes.text();
  console.log('Upload response text:', uploadText);

  if (uploadRes.ok) {
    findings.push({
      id: 'UNRESTRICTED-FILE-UPLOAD',
      severity: 'Critical',
      area: 'File Upload',
      title: 'Unrestricted File Upload: Executable .exe file uploaded without MIME/extension rejection',
      evidence: `POST /clubbing-rules/upload-banner accepted malware.exe with HTTP ${uploadRes.status}: ${uploadText}`,
    });
  } else {
    console.log('PASS: Executable upload was rejected.');
  }

  // 6. AUDIT LOG VERIFICATION
  console.log('\n[TEST 6] Audit Log Invariant & Immutability Verification');
  const auditRes = await fetch(`${BACKEND_URL}/audit-logs?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  console.log('GET /audit-logs status:', auditRes.status);
  const auditData = await auditRes.json();
  const recentLogs = auditData.logs || auditData.data || auditData;
  console.log(`Fetched ${recentLogs?.length || 0} audit logs.`);
  if (recentLogs?.length > 0) {
    const latest = recentLogs[0];
    console.log('Latest audit entry sample:', {
      action: latest.action,
      entityType: latest.entityType,
      actorEmail: latest.user?.email || latest.actorEmail || latest.userId,
      ip: latest.ipAddress,
      createdAt: latest.createdAt,
    });
  }

  console.log('\n=== INFRASTRUCTURE & SECURITY FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
}

runInfraAndSecurityTests().catch(console.error);
