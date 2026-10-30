/**
 * Automated Test Suite: Dynamic Festive Navbar Labeling & Single-Click Pre-Curated Bundle Flow
 *
 * Verifies:
 * 1. Live backend active rule retrieval from PostgreSQL (ecom_db)
 * 2. Dynamic festival title extraction for navbar (DIWALI) & fallback handling
 * 3. Pre-curated festive bundle page layout (/clubbing & /festive) with itemized breakdown & free gifts
 * 4. Verification that old manual item picker ("Step 1: Choose Any 3 Items") is removed
 * 5. Single-click bundle discount engine calculation (Flat ₹999 applied, savings reflected)
 * 6. Runtime HTTP 200 health checks across all 3 servers (:5000, :3000, :3001)
 */

import { extractFestivalNavLabel, calculateClubbingDiscount, getActiveClubbings } from '../lib/api/clubbings.js'

const BACKEND_URL = 'http://localhost:5000'
const STOREFRONT_URL = 'http://localhost:3000'
const ADMIN_URL = 'http://localhost:3001'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`)
  } else {
    failed++
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message}`)
  }
}

async function runTests() {
  console.log('\n===============================================================')
  console.log(' SUITE 1: Live PostgreSQL Rule & Dynamic Festive Navbar Labeling')
  console.log('===============================================================')

  // 1.1 Fetch active clubbing rules from NestJS backend
  const activeRes = await fetch(`${BACKEND_URL}/clubbing/active`)
  assert(activeRes.status === 200, 'GET /clubbing/active returns HTTP 200')
  const activeRules = await activeRes.json()
  assert(Array.isArray(activeRules) && activeRules.length > 0, `Fetched ${activeRules.length} active rules from PostgreSQL (ecom_db)`)

  const primaryRule = activeRules[0]
  assert(Boolean(primaryRule && primaryRule.name), `Primary active rule name: "${primaryRule.name}"`)

  // 1.2 Test dynamic title extractor
  const dynamicTitle = extractFestivalNavLabel(primaryRule)
  assert(dynamicTitle === 'DIWALI', `Dynamic festival title for "${primaryRule.name}" resolved to: "${dynamicTitle}"`)

  // 1.3 Test fallbacks
  assert(extractFestivalNavLabel({ name: 'Navratri Puja Sanctum' }) === 'NAVRATRI', 'Navratri rule resolves to "NAVRATRI"')
  assert(extractFestivalNavLabel({ name: 'Holi Special Color Blast' }) === 'HOLI', 'Holi rule resolves to "HOLI"')
  assert(extractFestivalNavLabel(null) === 'FESTIVE', 'Null rule falls back gracefully to "FESTIVE"')
  assert(extractFestivalNavLabel({}) === 'FESTIVE', 'Empty rule falls back gracefully to "FESTIVE"')

  // 1.4 Test Storefront Homepage HTML for dynamic navbar label
  const homeRes = await fetch(`${STOREFRONT_URL}/`)
  assert(homeRes.status === 200, 'Customer Storefront Homepage returns HTTP 200')
  const homeHtml = await homeRes.text()
  assert(homeHtml.includes('DIWALI'), 'Storefront Navbar renders dynamic festival label "DIWALI"')
  assert(homeHtml.includes('/clubbing'), 'Navbar festival link targets "/clubbing"')


  console.log('\n===============================================================')
  console.log(' SUITE 2: Pre-Packaged / Single-Click Festive Bundle Layout')
  console.log('===============================================================')

  // 2.1 Fetch /clubbing page HTML
  const clubbingRes = await fetch(`${STOREFRONT_URL}/clubbing`)
  assert(clubbingRes.status === 200, 'GET /clubbing returns HTTP 200')
  const clubbingHtml = await clubbingRes.text()

  // 2.2 Verify Pre-Curated Bundle elements
  assert(clubbingHtml.includes('Diwali Sacred Divine Gift Box'), 'Renders "Diwali Sacred Divine Gift Box" curated bundle')
  assert(clubbingHtml.includes('Deepavali Mahalakshmi Shuddhi Pack'), 'Renders "Deepavali Mahalakshmi Shuddhi Pack" bundle')
  assert(clubbingHtml.includes('Maha Aarti Royal Commemorative Samagri'), 'Renders "Maha Aarti Royal Commemorative Samagri" bundle')
  assert(clubbingHtml.includes('Package Contents'), 'Displays itemized package contents section')
  assert(clubbingHtml.includes('Festive Bonus Included') || clubbingHtml.includes('Complimentary Sacred Brass'), 'Includes free celebratory brass gift in package')
  assert(clubbingHtml.includes('Add Festive Pack to Cart'), 'Renders single-click "Add Festive Pack to Cart" action button')
  assert(clubbingHtml.includes('Buy Package Now'), 'Renders direct "Buy Package Now" quick checkout button')

  // 2.3 Verify OLD manual item-by-item selection picker is completely removed
  assert(!clubbingHtml.includes('Step 1: Choose Any'), 'Old manual picker ("Step 1: Choose Any") is NOT present')
  assert(!clubbingHtml.includes('Bundle Progress:'), 'Old manual item progress picker is removed')

  // 2.4 Verify /festive alias page renders identically
  const festiveRes = await fetch(`${STOREFRONT_URL}/festive`)
  assert(festiveRes.status === 200, 'GET /festive returns HTTP 200')
  const festiveHtml = await festiveRes.text()
  assert(festiveHtml.includes('Diwali Sacred Divine Gift Box'), '/festive route renders pre-packaged bundle layout')


  console.log('\n===============================================================')
  console.log(' SUITE 3: Cart Bundle Data Alignment & Flat Pricing Calculation')
  console.log('===============================================================')

  const activeClubbings = await getActiveClubbings()

  // 3.1 Test Diwali Sacred Divine Box items addition:
  // Item 1: sd-004 (549), Item 2: sd-001 (399), Item 3: sd-002 (349) => Total: 1297
  // Flat price: 999 => Discount: 298
  const diwaliBoxCartItems = [
    { product_id: 'sd-004', price: 549, regular_price: 749, quantity: 1 },
    { product_id: 'sd-001', price: 399, regular_price: 499, quantity: 1 },
    { product_id: 'sd-002', price: 349, regular_price: 449, quantity: 1 }
  ]

  const diwaliDiscountResult = calculateClubbingDiscount(diwaliBoxCartItems, activeClubbings)
  assert(diwaliDiscountResult.discount === 298, `Flat ₹999 discount calculated correctly: ₹${diwaliDiscountResult.discount} (Expected: ₹298)`)
  assert(Boolean(diwaliDiscountResult.appliedRule), `Rule applied: "${diwaliDiscountResult.appliedRule?.name}"`)

  const effectivePayable = diwaliBoxCartItems.reduce((s, it) => s + it.price * it.quantity, 0) - diwaliDiscountResult.discount
  assert(effectivePayable === 999, `Effective customer payable total is exactly ₹${effectivePayable} (Flat ₹999)`)

  // 3.2 Test 4-item Percentage Bundle:
  // 4 items totaling 1696 with 25% off => 424 savings
  const percentageCartItems = [
    { product_id: 'sd-004', price: 549, quantity: 1 },
    { product_id: 'sd-005', price: 499, quantity: 1 },
    { product_id: 'sd-003', price: 449, quantity: 1 },
    { product_id: 'sd-008', price: 299, quantity: 1 }
  ]
  const pctDiscountResult = calculateClubbingDiscount(percentageCartItems, activeClubbings)
  assert(pctDiscountResult.discount > 0, `Percentage bundle discount applied: ₹${pctDiscountResult.discount}`)


  console.log('\n===============================================================')
  console.log(' SUITE 4: Full-Stack Health & Endpoint Availability Checks')
  console.log('===============================================================')

  const endpointsToCheck = [
    { name: 'Backend: Active Clubbings', url: `${BACKEND_URL}/clubbing/active` },
    { name: 'Backend: Clubbing Rules CRUD', url: `${BACKEND_URL}/clubbing-rules` },
    { name: 'Backend: Dynamic Shipping Slabs', url: `${BACKEND_URL}/shipping-slabs` },
    { name: 'Backend: Orders & Invoices API', url: `${BACKEND_URL}/orders` },
    { name: 'Storefront: Homepage', url: `${STOREFRONT_URL}/` },
    { name: 'Storefront: Festive Bundles (/clubbing)', url: `${STOREFRONT_URL}/clubbing` },
    { name: 'Storefront: Festive Alias (/festive)', url: `${STOREFRONT_URL}/festive` },
    { name: 'Storefront: Checkout Page (/checkout)', url: `${STOREFRONT_URL}/checkout` },
    { name: 'Admin Portal: Clubbing Rules Dashboard', url: `${ADMIN_URL}/clubbing-rules` },
    { name: 'Admin Portal: Shipping Slabs Dashboard', url: `${ADMIN_URL}/shipping-slabs` },
    { name: 'Admin Portal: Orders & Invoices Dashboard', url: `${ADMIN_URL}/orders` }
  ]

  for (const ep of endpointsToCheck) {
    try {
      const res = await fetch(ep.url)
      assert(res.status === 200, `${ep.name} is LIVE (${ep.url}) - HTTP 200`)
    } catch (err) {
      assert(false, `${ep.name} (${ep.url}) failed: ${err.message}`)
    }
  }

  console.log('\n===============================================================')
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('===============================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
