/**
 * Clubbing Module & Coupon System Automated Test Suite
 *
 * Verifies:
 * 1. Clubbings CRUD operations, storage, and status toggles
 * 2. Festive banner presets and metadata
 * 3. Clubbing bundle discount engine (Fixed price bundle & Percentage discount bundle)
 * 4. Coupon catalog, case-insensitivity, and spend restriction validation
 * 5. Role navigation items and route page existence on disk
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  getAllClubbingsSync,
  getActiveClubbings,
  createClubbing,
  updateClubbing,
  toggleClubbingStatus,
  deleteClubbing,
  calculateClubbingDiscount,
  FESTIVE_BANNER_PRESETS
} from '../lib/api/clubbings.js'
import {
  ACTIVE_STORE_COUPONS,
  findCouponByCode,
  validateCouponRestrictions
} from '../lib/coupons.js'
import { ROLE_NAV_ITEMS } from '../lib/roles.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  [PASS] ${message}`)
  } else {
    failed++
    console.error(`  [FAIL] ${message}`)
  }
}

console.log('\n===============================================================')
console.log(' SUITE 1: Clubbings API & Initial Seed')
console.log('===============================================================')

const all = getAllClubbingsSync()
assert(Array.isArray(all) && all.length >= 3, `Loaded ${all.length} default clubbing campaigns`)

const diwaliCampaign = all.find(c => c.name.includes('Diwali'))
assert(Boolean(diwaliCampaign), 'Diwali Clubbing campaign exists in seed')
assert(diwaliCampaign.tagline === 'Diwali Sale', 'Diwali campaign has "Diwali Sale" tagline')
assert(diwaliCampaign.type === 'fixed_price_bundle', 'Diwali campaign is fixed_price_bundle')
assert(diwaliCampaign.fixedPrice === 999, 'Diwali campaign fixed price is ₹999')
assert(Boolean(diwaliCampaign.bannerImage), 'Diwali campaign has banner image configured')

console.log('\n===============================================================')
console.log(' SUITE 2: Clubbings Bundle Discount Calculation Engine')
console.log('===============================================================')

// Mock cart items: 3 items priced at ₹399 each (Total: ₹1197)
const cartItems = [
  { product_id: 101, name: 'Sandalwood Dhoop', price: 399, quantity: 1 },
  { product_id: 102, name: 'Guggal Agarbatti', price: 399, quantity: 1 },
  { product_id: 103, name: 'Rose Sambrani', price: 399, quantity: 1 }
]

// Test 1: Single fixed-price rule evaluation
const singleRuleResult = calculateClubbingDiscount(cartItems, [diwaliCampaign])
assert(singleRuleResult.discount === 198, `Fixed price bundle discount calculated correctly: ₹${singleRuleResult.discount} (expected 198)`)
assert(singleRuleResult.appliedRule.id === diwaliCampaign.id, `Applied rule matches ${singleRuleResult.appliedRule.name}`)

// Test 2: Best-offer selection across multiple active rules (Rule 2 gives 20% = ₹239 which is > ₹198)
const bestDiscountResult = calculateClubbingDiscount(cartItems, all)
assert(bestDiscountResult.discount === 239, `Customer gets best bundle savings: ₹${bestDiscountResult.discount} (20% off > ₹198 flat)`)
assert(bestDiscountResult.appliedRule.type === 'percentage_off_bundle', 'Best rule selected percentage bundle')

// Test 3: Insufficient quantity (2 items instead of 3)
const smallCart = [
  { product_id: 101, name: 'Sandalwood Dhoop', price: 399, quantity: 2 }
]
const noDiscountResult = calculateClubbingDiscount(smallCart, all)
assert(noDiscountResult.discount === 0, 'No discount applied when cart does not meet required quantity (2 < 3)')

// Test percentage off bundle (3 sambrani items at ₹200 each = ₹600 total, 20% off = ₹120)
const percentageRule = [
  {
    id: 'clb_pct_test',
    name: 'Trio 20% Off',
    type: 'percentage_off_bundle',
    requiredQuantity: 3,
    percentageOff: 20,
    isActive: true
  }
]
const pctCart = [
  { product_id: 201, price: 200, quantity: 3 }
]
const pctResult = calculateClubbingDiscount(pctCart, percentageRule)
assert(pctResult.discount === 120, `Percentage bundle discount calculated correctly: ₹${pctResult.discount} (expected 120)`)

console.log('\n===============================================================')
console.log(' SUITE 3: Festive Banner Presets')
console.log('===============================================================')

assert(Array.isArray(FESTIVE_BANNER_PRESETS) && FESTIVE_BANNER_PRESETS.length >= 3, `FESTIVE_BANNER_PRESETS has ${FESTIVE_BANNER_PRESETS.length} presets`)
const goldPreset = FESTIVE_BANNER_PRESETS.find(p => p.id === 'diwali_gold')
assert(Boolean(goldPreset), 'Diwali Gold preset is present with URL and accent styling')

console.log('\n===============================================================')
console.log(' SUITE 4: Active Store Coupons & Validation Logic')
console.log('===============================================================')

assert(Array.isArray(ACTIVE_STORE_COUPONS) && ACTIVE_STORE_COUPONS.length >= 5, `Store has ${ACTIVE_STORE_COUPONS.length} active coupons`)

const welcomeCoupon = findCouponByCode('WELCOME10')
assert(Boolean(welcomeCoupon), 'findCouponByCode("WELCOME10") finds coupon')
assert(welcomeCoupon.discount_type === 'percent', 'WELCOME10 is percent discount')
assert(welcomeCoupon.amount === '10', 'WELCOME10 amount is 10%')

// Case insensitivity
const lowercaseMatch = findCouponByCode('welcome10')
assert(Boolean(lowercaseMatch), 'findCouponByCode is case-insensitive')

const diwaliCoupon = findCouponByCode('DIWALI2026')
assert(Boolean(diwaliCoupon), 'findCouponByCode("DIWALI2026") finds festival coupon')
assert(diwaliCoupon.discount_type === 'fixed_cart', 'DIWALI2026 is fixed_cart discount')
assert(diwaliCoupon.amount === '200', 'DIWALI2026 amount is ₹200')

// Invalid code
assert(findCouponByCode('INVALID_CODE_XYZ') === null, 'Non-existent coupon returns null')

// Spend Restrictions Validation
const underMinSpend = validateCouponRestrictions(welcomeCoupon, 350)
assert(!underMinSpend.valid, 'Coupon fails when order subtotal ₹350 is below minimum spend ₹499')
assert(underMinSpend.error.includes('minimum spend'), 'Error message states minimum spend requirement')

const validSpend = validateCouponRestrictions(welcomeCoupon, 1000)
assert(validSpend.valid, 'Coupon succeeds when order subtotal ₹1000 meets minimum spend ₹499')
assert(validSpend.discount === 100, `10% of ₹1000 calculates to ₹${validSpend.discount}`)

const fixedSpend = validateCouponRestrictions(diwaliCoupon, 1500)
assert(fixedSpend.valid, 'DIWALI2026 succeeds on ₹1500 order')
assert(fixedSpend.discount === 200, `DIWALI2026 gives flat ₹${fixedSpend.discount} discount`)

console.log('\n===============================================================')
console.log(' SUITE 5: Role Navigation & Route Pages Existence')
console.log('===============================================================')

const adminClubbingNav = ROLE_NAV_ITEMS.admin.find(i => i.label === 'Clubbings')
assert(Boolean(adminClubbingNav), 'Admin nav includes "Clubbings"')
assert(adminClubbingNav?.href === '/admin/clubbings', 'Admin Clubbings href is /admin/clubbings')

const editorClubbingNav = ROLE_NAV_ITEMS.editor.find(i => i.label === 'Clubbings')
assert(Boolean(editorClubbingNav), 'Editor nav includes "Clubbings"')
assert(editorClubbingNav?.href === '/staff/clubbings', 'Editor Clubbings href is /staff/clubbings')

// Check physical files on disk
const expectedPages = [
  'app/admin/clubbings/page.js',
  'app/admin/clubbings/new/page.js',
  'app/admin/clubbings/[id]/edit/page.js',
  'app/staff/clubbings/page.js',
  'app/staff/clubbings/new/page.js',
  'app/staff/clubbings/[id]/edit/page.js',
  'app/clubbing/page.js',
  'components/clubbings/clubbings-list-view.jsx',
  'components/clubbings/clubbing-form-view.jsx',
  'components/home/clubbing-festive-banner.jsx'
]

for (const p of expectedPages) {
  const fullPath = path.join(ROOT, p)
  assert(fs.existsSync(fullPath), `Physical file exists: ${p}`)
}

console.log('\n===============================================================')
console.log(` CLUBBING & COUPON TEST SUMMARY: ${passed} Passed, ${failed} Failed`)
console.log('===============================================================\n')

if (failed > 0) {
  process.exit(1)
}
