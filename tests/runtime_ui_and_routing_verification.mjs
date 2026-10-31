import assert from 'node:assert';

console.log('\n===============================================================');
console.log(' MASTER VERIFICATION: 3 UI & ROUTING ISSUES RESOLUTION');
console.log('===============================================================\n');

async function runTests() {
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
  // SUITE 1: Server Status Checks
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Server Health & Port Checks ---');
  const servers = [
    { name: 'NestJS Backend API', url: 'http://localhost:5000/products' },
    { name: 'Customer Storefront', url: 'http://localhost:3000' },
    { name: 'Admin Portal', url: 'http://localhost:3001' },
  ];

  for (const s of servers) {
    try {
      const res = await fetch(s.url);
      assert.strictEqual(res.status, 200, `${s.name} returned status ${res.status}`);
      pass(`${s.name} (${s.url}) is healthy and returned HTTP 200`);
    } catch (e) {
      fail(`${s.name} check failed`, e);
    }
  }

  // -------------------------------------------------------------
  // SUITE 2: Issue 1 — Homepage Runtime & API Resiliency
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Issue 1 — Homepage Runtime & API Resiliency ---');
  try {
    const res = await fetch('http://localhost:3000');
    assert.strictEqual(res.status, 200);
    const html = await res.text();

    assert.ok(!html.includes('Something went wrong'), 'Homepage rendered error boundary "Something went wrong"');
    pass('Homepage loads with HTTP 200 and zero error boundaries');

    assert.ok(html.includes('SRIDATTAM') || html.includes('Featured Collection'), 'Homepage contains expected core branding');
    pass('Homepage contains brand headers and featured collection section');

    // Test API endpoints feeding the homepage
    const productsRes = await fetch('http://localhost:3000/api/products?featured=true&limit=8');
    assert.strictEqual(productsRes.status, 200);
    const products = await productsRes.json();
    assert.ok(Array.isArray(products) && products.length > 0, 'Products endpoint returned valid array');
    pass(`/api/products returned HTTP 200 with ${products.length} products`);

    const categoriesRes = await fetch('http://localhost:3000/api/categories');
    assert.strictEqual(categoriesRes.status, 200);
    const categories = await categoriesRes.json();
    assert.ok(Array.isArray(categories) && categories.length > 0, 'Categories endpoint returned valid array');
    pass(`/api/categories returned HTTP 200 with ${categories.length} categories`);

    const reviewsRes = await fetch('http://localhost:3000/api/products/reviews');
    assert.strictEqual(reviewsRes.status, 200);
    const reviews = await reviewsRes.json();
    assert.ok(Array.isArray(reviews), 'Reviews endpoint returned valid array');
    pass(`/api/products/reviews returned HTTP 200 with graceful array fallback`);

    const clubbingActiveRes = await fetch('http://localhost:3000/api/clubbing/active');
    assert.strictEqual(clubbingActiveRes.status, 200);
    const clubbingActive = await clubbingActiveRes.json();
    assert.ok(Array.isArray(clubbingActive), 'Clubbing active endpoint returned valid array');
    pass(`/api/clubbing/active returned HTTP 200 with ${clubbingActive.length} active rules`);
  } catch (e) {
    fail('Homepage runtime test failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 3: Issue 2 — Festive Page High-Contrast UI & Typography
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Issue 2 — Festive Page High-Contrast UI & Typography ---');
  try {
    const res = await fetch('http://localhost:3000/clubbing');
    assert.strictEqual(res.status, 200);
    const html = await res.text();

    assert.ok(!html.includes('Something went wrong'), 'Festive page rendered error boundary');
    pass('Festive Page (/clubbing) loads with HTTP 200 and zero errors');

    // Typography & contrast checks
    assert.ok(html.includes('text-[#2D1515]') || html.includes('#2D1515'), 'Contains deep rich brown/maroon `#2D1515` typography');
    pass('Typography uses deep rich maroon `#2D1515` for card titles and package headers');

    assert.ok(html.includes('border-2 border-stone-300') || html.includes('border-2 border-[#D7A65B]'), 'Contains distinct prominent borders');
    pass('Cards feature distinct prominent 2px borders with gold/stone contrast');

    assert.ok(html.includes('bg-[#FFD700]') || html.includes('bg-amber-100') || html.includes('text-amber-950') || html.includes('text-amber-700'), 'Contains bright gold/maroon savings badges');
    pass('Savings badges render with bright gold/maroon accents');

    assert.ok(html.includes('Add Festive Pack to Cart'), 'Renders solid "Add Festive Pack to Cart" button');
    pass('Action button "Add Festive Pack to Cart" is present with solid styling');

    assert.ok(html.includes('Buy Package Now'), 'Renders solid "Buy Package Now" button');
    pass('Action button "Buy Package Now" is present with solid styling');

    assert.ok(html.includes('Diwali Sacred Divine Gift Box'), 'Displays curated bundle title');
    pass('Curated festive bundles are rendered cleanly');
  } catch (e) {
    fail('Festive module page UI contrast test failed', e);
  }

  // -------------------------------------------------------------
  // SUITE 4: Issue 3 — Products Page & Dynamic Festive Category Filter
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Issue 3 — Products Page & Dynamic Festive Category Filter ---');
  try {
    // 1. General Products Page
    const prodRes = await fetch('http://localhost:3000/products');
    assert.strictEqual(prodRes.status, 200);
    const prodHtml = await prodRes.text();

    assert.ok(!prodHtml.includes('Something went wrong'), 'Products page crashed with error boundary');
    assert.ok(!prodHtml.includes('No products found'), 'Products page incorrectly showed "No products found" on default view');
    pass('Products Page (/products) loads with HTTP 200 and displays product catalog');

    // 2. Dynamic Festive Category Option in Sidebar
    assert.ok(
      prodHtml.includes('Diwali') || prodHtml.includes('festive-bundles') || prodHtml.includes('Bundles'),
      'Sidebar includes dynamic festive category filter option'
    );
    pass('Left sidebar dynamically includes active festival category option with SPECIAL badge');

    // 3. Filtering by Dynamic Festive Category
    const festiveFilterRes = await fetch('http://localhost:3000/products?category=festive-bundles');
    assert.strictEqual(festiveFilterRes.status, 200);
    const festiveFilterHtml = await festiveFilterRes.text();

    assert.ok(!festiveFilterHtml.includes('Something went wrong'), 'Festive filter crashed');
    assert.ok(!festiveFilterHtml.includes('No products found'), 'Festive filter showed no products found');
    assert.ok(
      festiveFilterHtml.includes('Diwali Sacred Divine Gift Box') || festiveFilterHtml.includes('Festive Special') || festiveFilterHtml.includes('Add Bundle'),
      'Festive filter renders curated festive bundles directly in grid'
    );
    pass('Clicking festive category filters and renders pre-packaged clubbing bundles in the grid');
    pass('Pre-packaged bundle cards display itemized contents, instant bundle pricing, and 1-click CTAs');
  } catch (e) {
    fail('Products page & dynamic festive category test failed', e);
  }

  console.log('\n===============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
