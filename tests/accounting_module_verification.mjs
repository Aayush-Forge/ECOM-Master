import assert from 'node:assert';

console.log('\n===============================================================');
console.log(' MASTER TEST: ACCOUNTING & FINANCE MODULE VERIFICATION');
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
  // SUITE 1: Admin Portal (Port 3001) Accounting Module Verification
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Admin Portal (Port 3001) /accounting ---');
  try {
    const res = await fetch('http://localhost:3001/accounting');
    assert.strictEqual(res.status, 200, 'Port 3001 /accounting should return HTTP 200');
    const html = await res.text();

    assert.ok(html.includes('Accounting &amp; Finance') || html.includes('Accounting & Finance'), 'Contains Accounting & Finance heading');
    assert.ok(html.includes('Finance Workspace') || html.includes('Finance workspace') || html.includes('FINANCE WORKSPACE'), 'Contains Finance Workspace eyebrow');
    assert.ok(html.includes('Gross order value'), 'Renders Gross order value metric card');
    assert.ok(html.includes('Payments collected'), 'Renders Payments collected metric card');
    assert.ok(html.includes('GST collected / payable'), 'Renders GST collected / payable metric card');
    assert.ok(html.includes('Refunds recorded'), 'Renders Refunds recorded metric card');
    assert.ok(html.includes('Sales &amp; collections') || html.includes('Sales & collections'), 'Renders Sales & collections trend chart panel');
    assert.ok(html.includes('Order accounting ledger'), 'Renders Order accounting ledger table panel');
    assert.ok(html.includes('GST summary'), 'Renders GST summary panel');
    assert.ok(html.includes('Payment reconciliation'), 'Renders Payment reconciliation panel');
    assert.ok(html.includes('ORD-1048'), 'Displays sample order ORD-1048');
    assert.ok(html.includes('Ananya Rao'), 'Displays customer Ananya Rao');
    assert.ok(html.includes('Export CSV'), 'Includes Export CSV action button');
    assert.ok(html.includes('Create Invoice'), 'Includes Create Invoice action button');
    pass('Admin Portal /accounting renders all required accounting metrics, charts, ledger, and reconciliation panels');
  } catch (e) {
    fail('Admin portal accounting check failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 2: Storefront Admin (Port 3000) /admin/accounting
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Storefront Admin (Port 3000) /admin/accounting ---');
  try {
    const res = await fetch('http://localhost:3000/admin/accounting');
    assert.strictEqual(res.status, 200, 'Port 3000 /admin/accounting should return HTTP 200');
    const html = await res.text();

    assert.ok(html.includes('Accounting'), 'Contains Accounting title or metadata in storefront admin view');
    pass('Storefront Admin /admin/accounting is live with HTTP 200 under Management section');
  } catch (e) {
    fail('Storefront admin accounting check failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 3: Existing Working Modules Regression Check
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Existing Working Modules Regression Check ---');
  const existingEndpoints = [
    { url: 'http://localhost:3001/clubbing-rules', name: 'Admin Portal: Clubbing Rules' },
    { url: 'http://localhost:3001/shipping-slabs', name: 'Admin Portal: Shipping Slabs' },
    { url: 'http://localhost:3001/orders', name: 'Admin Portal: Orders & Invoices' },
    { url: 'http://localhost:3000/', name: 'Storefront: Homepage' },
    { url: 'http://localhost:3000/clubbing', name: 'Storefront: Festive Bundles' },
    { url: 'http://localhost:3000/products', name: 'Storefront: Products Page' },
    { url: 'http://localhost:5000/orders', name: 'Backend: Orders API' },
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
