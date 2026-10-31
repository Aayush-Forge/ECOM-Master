/**
 * Sridattam Coupon & Promotion System
 *
 * Provides active promotional coupon codes, fallback store catalog,
 * and coupon validation logic for checkout and API routes.
 */

export const ACTIVE_STORE_COUPONS = [
  {
    id: 'cpn_welcome10',
    code: 'WELCOME10',
    description: '10% off on your sacred order above ₹499',
    discount_type: 'percent',
    amount: '10',
    minimum_amount: '499',
    maximum_amount: '50000',
    individual_use: true,
    exclude_sale_items: false,
    product_ids: [],
    excluded_product_ids: [],
    product_categories: [],
    excluded_product_categories: [],
    free_shipping: false,
  },
  {
    id: 'cpn_diwali2026',
    code: 'DIWALI2026',
    description: '₹200 flat off on auspicious Diwali orders above ₹999',
    discount_type: 'fixed_cart',
    amount: '200',
    minimum_amount: '999',
    maximum_amount: '50000',
    individual_use: false,
    exclude_sale_items: false,
    product_ids: [],
    excluded_product_ids: [],
    product_categories: [],
    excluded_product_categories: [],
    free_shipping: false,
  },
  {
    id: 'cpn_festive100',
    code: 'FESTIVE100',
    description: '₹100 flat off on festival orders above ₹699',
    discount_type: 'fixed_cart',
    amount: '100',
    minimum_amount: '699',
    maximum_amount: '50000',
    individual_use: false,
    exclude_sale_items: false,
    product_ids: [],
    excluded_product_ids: [],
    product_categories: [],
    excluded_product_categories: [],
    free_shipping: false,
  },
  {
    id: 'cpn_sridattam10',
    code: 'SRIDATTAM10',
    description: '10% off entire devotional catalog',
    discount_type: 'percent',
    amount: '10',
    minimum_amount: '0',
    maximum_amount: '50000',
    individual_use: false,
    exclude_sale_items: false,
    product_ids: [],
    excluded_product_ids: [],
    product_categories: [],
    excluded_product_categories: [],
    free_shipping: false,
  },
  {
    id: 'cpn_sambrani50',
    code: 'SAMBRANI50',
    description: '₹50 off on pure Sambrani & dhoop cup orders above ₹350',
    discount_type: 'fixed_cart',
    amount: '50',
    minimum_amount: '350',
    maximum_amount: '50000',
    individual_use: false,
    exclude_sale_items: false,
    product_ids: [],
    excluded_product_ids: [],
    product_categories: [],
    excluded_product_categories: [],
    free_shipping: false,
  },
]

/**
 * Finds coupon by code (case-insensitive).
 * @param {string} code
 * @returns {object|null}
 */
export function findCouponByCode(code) {
  if (!code || typeof code !== 'string') return null
  const clean = code.trim().toUpperCase()
  return ACTIVE_STORE_COUPONS.find((c) => c.code.toUpperCase() === clean) || null
}

/**
 * Validates a coupon against a given cart subtotal and display items.
 * @param {object} coupon
 * @param {number} subtotal
 * @param {Array} items
 * @returns {{ valid: boolean, error?: string, discount: number }}
 */
export function validateCouponRestrictions(coupon, subtotal, items = []) {
  if (!coupon) {
    return { valid: false, error: 'Coupon code not found.', discount: 0 }
  }

  const minSpend = parseFloat(coupon.minimum_amount || '0')
  if (minSpend > 0 && subtotal < minSpend) {
    return {
      valid: false,
      error: `This coupon requires a minimum spend of ₹${minSpend.toFixed(0)}.`,
      discount: 0,
    }
  }

  const maxSpend = parseFloat(coupon.maximum_amount || '0')
  if (maxSpend > 0 && subtotal > maxSpend) {
    return {
      valid: false,
      error: `This coupon is only valid for spends under ₹${maxSpend.toFixed(0)}.`,
      discount: 0,
    }
  }

  if (coupon.exclude_sale_items) {
    const hasNonSale = items.some((item) => (item.regular_price || item.price) <= item.price)
    if (!hasNonSale && items.length > 0) {
      return {
        valid: false,
        error: 'This coupon excludes items already on sale.',
        discount: 0,
      }
    }
  }

  let calculatedDiscount = 0
  if (coupon.discount_type === 'percent') {
    calculatedDiscount = (subtotal * parseFloat(coupon.amount || '0')) / 100
  } else if (coupon.discount_type === 'fixed_cart') {
    calculatedDiscount = Math.min(parseFloat(coupon.amount || '0'), subtotal)
  }

  return {
    valid: calculatedDiscount > 0,
    error: calculatedDiscount <= 0 ? 'This coupon does not provide a discount on current cart.' : undefined,
    discount: Math.round(calculatedDiscount),
  }
}
