/**
 * Discounts API client.
 * Real backend discount rules engine is pending integration.
 */

export function getAllDiscountsSync() {
  return [];
}

export function getDiscountByIdSync(id) {
  return null;
}

export async function getAllDiscounts() {
  return [];
}

export async function getDiscountById(id) {
  return null;
}

export async function createDiscount(data) {
  throw new Error('Discounts engine is coming soon.');
}

export async function updateDiscount(id, data) {
  throw new Error('Discounts engine is coming soon.');
}

export async function deleteDiscount(id) {
  return { success: false };
}
