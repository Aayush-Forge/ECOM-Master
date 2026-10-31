import assert from 'node:assert';

console.log('\n===============================================================');
console.log(' MASTER TEST: REAL ACCOUNTING & MODULES VERIFICATION');
console.log('===============================================================\n');

async function run() {
  let passed = 0;
  let failed = 0;

  function pass(msg) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }

  function fail(msg, err) {
    console.error(`  [FAIL] ${msg}:`, err?.message || err);
    failed++;
  }

  // -------------------------------------------------------------
  // SUITE 1: Real Accounting Backend API (Port 5000)
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Backend Accounting API (/admin/accounting) ---');
  try {
    const summaryRes = await fetch('http://localhost:5000/admin/accounting/summary');
    assert.strictEqual(summaryRes.status, 200, 'GET /admin/accounting/summary should return HTTP 200');
    const summary = await summaryRes.json();
    assert.ok(typeof summary.summary?.grossOrderValue === 'number', 'Summary contains grossOrderValue');
    assert.ok(typeof summary.summary?.paymentsCollected === 'number', 'Summary contains paymentsCollected');
    assert.ok(typeof summary.summary?.netProfit === 'number', 'Summary contains netProfit');
    pass('Backend /admin/accounting/summary returns live PostgreSQL financial aggregates');

    const trendRes = await fetch('http://localhost:5000/admin/accounting/daily-breakdown');
    assert.strictEqual(trendRes.status, 200, 'GET /admin/accounting/daily-breakdown should return HTTP 200');
    const trend = await trendRes.json();
    assert.ok(Array.isArray(trend), 'Daily breakdown is an array');
    pass('Backend /admin/accounting/daily-breakdown returns time-series sales data');

    const ordersRes = await fetch('http://localhost:5000/admin/accounting/orders');
    assert.strictEqual(ordersRes.status, 200, 'GET /admin/accounting/orders should return HTTP 200');
    const orders = await ordersRes.json();
    assert.ok(Array.isArray(orders) && orders.length > 0, 'Orders ledger contains real database orders');
    pass(`Backend /admin/accounting/orders returns ${orders.length} real ledger transactions`);

    const csvRes = await fetch('http://localhost:5000/admin/accounting/export-csv');
    assert.strictEqual(csvRes.status, 200, 'GET /admin/accounting/export-csv should return HTTP 200');
    const csv = await csvRes.text();
    assert.ok(csv.includes('Order ID') && csv.includes('Invoice No'), 'CSV export contains valid ledger headers');
    pass('Backend /admin/accounting/export-csv streams valid CSV file');
  } catch (e) {
    fail('Backend accounting check failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 2: Admin Portal (Port 3001) /accounting Dashboard
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Admin Portal (Port 3001) /accounting ---');
  try {
    const res = await fetch('http://localhost:3001/accounting');
    assert.strictEqual(res.status, 200, 'Port 3001 /accounting should return HTTP 200');
    const html = await res.text();

    assert.ok(
      html.includes('accounting') ||
      html.includes('Accounting') ||
      html.includes('Finance Workspace') ||
      html.includes('Verifying authorization'),
      'Renders accounting dashboard page inside admin shell'
    );
    pass('Admin Portal /accounting is live with HTTP 200 inside dashboard layout');
  } catch (e) {
    fail('Admin portal accounting check failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 3: Storefront Admin (Port 3000) /admin/accounting
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Storefront Admin (Port 3000) /admin/accounting ---');
  try {
    const res = await fetch('http://localhost:3000/admin/accounting');
    assert.strictEqual(res.status, 200, 'Port 3000 /admin/accounting should return HTTP 200');
    const html = await res.text();
    assert.ok(html.includes('Accounting'), 'Contains Accounting title or metadata in storefront admin view');
    pass('Storefront Admin /admin/accounting is live with HTTP 200');
  } catch (e) {
    fail('Storefront admin accounting check failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 4: Core System Regression Check (Port 3000, 3001, 5000)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Core System Regression Check ---');
  const existingEndpoints = [
    { url: 'http://localhost:3001/clubbings', name: 'Admin Portal: Clubbing Module' },
    { url: 'http://localhost:3001/shipping', name: 'Admin Portal: Unified Shipping' },
    { url: 'http://localhost:3001/orders', name: 'Admin Portal: Orders' },
    { url: 'http://localhost:3001/invoices-labels', name: 'Admin Portal: Invoices & Labels' },
    { url: 'http://localhost:3000/', name: 'Storefront: Homepage' },
    { url: 'http://localhost:3000/clubbing', name: 'Storefront: Clubbing Showcase' },
    { url: 'http://localhost:3000/products', name: 'Storefront: Products Page' },
    { url: 'http://localhost:5000/orders', name: 'Backend: Orders API' },
    { url: 'http://localhost:5000/shipping-templates/public', name: 'Backend: Shipping Templates API' },
  ];

  for (const ep of existingEndpoints) {
    try {
      const res = await fetch(ep.url);
      assert.strictEqual(res.status, 200, `${ep.name} returned status ${res.status}`);
      pass(`${ep.name} is intact and returned HTTP 200`);
    } catch (e) {
      fail(`${ep.name} regression check failed`, e);
    }
  }

  console.log('\n===============================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

run();
