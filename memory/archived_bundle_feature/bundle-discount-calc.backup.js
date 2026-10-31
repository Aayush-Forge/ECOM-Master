/**
 * Original Bundle Calculation Engine Backup
 * Archived October 30, 2026
 */

export function calculateClubbingDiscount(cartItems = [], activeClubbings = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { discount: 0, appliedRule: null };
  }

  let bestDiscount = 0;
  let bestRule = null;

  for (const rule of activeClubbings) {
    if (!rule.isActive) continue;

    // Filter applicable items
    const applicable = cartItems.filter((item) => {
      if (rule.applicableProductIds && rule.applicableProductIds.length > 0) {
        return rule.applicableProductIds.includes(item.product_id);
      }
      return true;
    });

    const totalQty = applicable.reduce((sum, item) => sum + (item.quantity || 1), 0);

    if (totalQty >= (rule.requiredQuantity || 3)) {
      const itemsTotalPrice = applicable.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
        0
      );

      let calcDiscount = 0;
      if (rule.type === 'fixed_price_bundle' && rule.fixedPrice !== null) {
        const bundlePrice = parseFloat(rule.fixedPrice);
        if (itemsTotalPrice > bundlePrice) {
          calcDiscount = itemsTotalPrice - bundlePrice;
        }
      } else if (rule.type === 'percentage_off_bundle' && rule.percentageOff !== null) {
        calcDiscount = (itemsTotalPrice * parseFloat(rule.percentageOff)) / 100;
      }

      if (calcDiscount > bestDiscount) {
        bestDiscount = calcDiscount;
        bestRule = rule;
      }
    }
  }

  return {
    discount: Math.round(bestDiscount),
    appliedRule: bestRule,
  };
}
