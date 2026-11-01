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

async function runPaginationFilterSortingTests() {
  console.log('--- RUNNING PAGINATION, FILTER & SORTING BOUNDARY TESTS ---');
  const admin = await login('admin@sridattam.com', 'password123');

  const endpoints = [
    { name: 'Products', path: '/products', auth: false },
    { name: 'Admin Orders', path: '/admin/orders', auth: true },
    { name: 'Admin Customers', path: '/admin/customers', auth: true },
    { name: 'Admin Reviews', path: '/reviews', auth: true },
    { name: 'Audit Logs', path: '/audit-logs', auth: true },
    { name: 'Admin Payments', path: '/admin/payments', auth: true },
  ];

  // Specific required boundary tests: page=0, -1, abc, limit=0, limit=100000 must return 400
  const validationBoundaries = [
    { label: 'page=0', query: '?page=0', expectedStatus: 400 },
    { label: 'page=-1', query: '?page=-1', expectedStatus: 400 },
    { label: 'page=abc', query: '?page=abc', expectedStatus: 400 },
    { label: 'limit=0', query: '?limit=0', expectedStatus: 400 },
    { label: 'limit=100000', query: '?limit=100000', expectedStatus: 400 },
  ];

  const boundaries = [
    { label: 'Normal page 1 limit 5', query: '?page=1&limit=5&per_page=5' },
    { label: 'Huge page', query: '?page=999999&limit=5&per_page=5' },
    { label: 'Negative limit', query: '?page=1&limit=-10&per_page=-10' },
    { label: 'SQLi sort column', query: '?page=1&sort_by=non_existent_col;DROP%20TABLE%20users;&sort_order=desc' },
    { label: 'Invalid sort order', query: '?page=1&sort_order=INVALID_ORDER' },
  ];

  const findings = [];
  let validationPassed = 0;
  let validationFailed = 0;

  for (const ep of endpoints) {
    console.log(`\nTesting ${ep.name} (${ep.path})...`);

    // First test invalid pagination returning 400
    for (const vb of validationBoundaries) {
      const url = `${BACKEND_URL}${ep.path}${vb.query}`;
      try {
        const res = await fetch(url, {
          headers: ep.auth ? { Authorization: `Bearer ${admin.token}` } : {},
        });
        if (res.status === vb.expectedStatus) {
          validationPassed++;
        } else {
          validationFailed++;
          findings.push({
            id: 'PAGINATION-VALIDATION-MISMATCH',
            severity: 'Medium',
            area: ep.name,
            title: `Expected HTTP ${vb.expectedStatus} on ${ep.path}${vb.query}, got ${res.status}`,
            evidence: `GET ${url} returned HTTP ${res.status}`,
          });
        }
      } catch (err) {
        findings.push({
          id: 'PAGINATION-FETCH-ERROR',
          severity: 'High',
          area: ep.name,
          title: `Network or crash error on ${ep.path} with "${vb.label}"`,
          evidence: err.message,
        });
      }
    }

    for (const b of boundaries) {
      const url = `${BACKEND_URL}${ep.path}${b.query}`;
      try {
        const res = await fetch(url, {
          headers: ep.auth ? { Authorization: `Bearer ${admin.token}` } : {},
        });
        const text = await res.text();

        if (res.status === 500) {
          findings.push({
            id: 'PAGINATION-CRASH-500',
            severity: 'High',
            area: ep.name,
            title: `Unhandled HTTP 500 on ${ep.path} with boundary "${b.label}"`,
            evidence: `GET ${url} returned HTTP 500: ${text.slice(0, 200)}`,
          });
        }
      } catch (err) {
        findings.push({
          id: 'PAGINATION-FETCH-ERROR',
          severity: 'High',
          area: ep.name,
          title: `Network or crash error on ${ep.path} with "${b.label}"`,
          evidence: err.message,
        });
      }
    }
  }

  console.log(`\nValidation bounds tested: ${validationPassed} passed HTTP 400 checks, ${validationFailed} failed`);
  console.log('\n=== PAGINATION, FILTER & SORTING FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));

  if (findings.length > 0) {
    process.exit(1);
  }
}

runPaginationFilterSortingTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
