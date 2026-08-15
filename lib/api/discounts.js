/**
 * Discounts API client — mock implementation.
 *
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend discount endpoints are ready.
 */

let MOCK_DISCOUNTS = [
  {
    id: 'disc_001',
    name: 'Any 3 for ₹999',
    type: 'bundle',
    conditions: 'Purchase any 3 products from the catalogue',
    discountValue: 999,
    displayValue: '₹999 flat',
    isActive: true,
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'disc_002',
    name: 'Buy 2 Get 1 Free',
    type: 'bundle',
    conditions: 'Buy any 2 incense packs, get the cheapest free',
    discountValue: 100,
    displayValue: '1 free item',
    isActive: true,
    createdAt: '2025-04-15T00:00:00Z',
  },
  {
    id: 'disc_003',
    name: '10% Off Above ₹2000',
    type: 'percentage',
    conditions: 'Cart total exceeds ₹2,000',
    discountValue: 10,
    displayValue: '10%',
    isActive: true,
    createdAt: '2025-05-01T00:00:00Z',
  },
  {
    id: 'disc_004',
    name: '₹100 Off First Order',
    type: 'flat',
    conditions: 'First-time customer only',
    discountValue: 100,
    displayValue: '₹100 flat',
    isActive: false,
    createdAt: '2025-06-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllDiscountsSync() {
  return [...MOCK_DISCOUNTS];
}

export function getDiscountByIdSync(id) {
  return MOCK_DISCOUNTS.find((d) => d.id === id) || null;
}

/** Get all discount rules. */
export async function getAllDiscounts() {
  return getAllDiscountsSync();
}

/** Get a single discount rule by ID. */
export async function getDiscountById(id) {
  return getDiscountByIdSync(id);
}

/** Create a new discount rule. */
export async function createDiscount(data) {
  // return fetch('/api/admin/discounts', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
  const newDiscount = {
    id: `disc_${String(MOCK_DISCOUNTS.length + 1).padStart(3, '0')}`,
    ...data,
    createdAt: new Date().toISOString(),
  };
  MOCK_DISCOUNTS.push(newDiscount);
  return newDiscount;
}

/** Update an existing discount rule. */
export async function updateDiscount(id, data) {
  // return fetch(`/api/admin/discounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json());
  const idx = MOCK_DISCOUNTS.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  MOCK_DISCOUNTS[idx] = { ...MOCK_DISCOUNTS[idx], ...data };
  return MOCK_DISCOUNTS[idx];
}

/** Delete a discount rule. */
export async function deleteDiscount(id) {
  // return fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' }).then(r => r.json());
  const idx = MOCK_DISCOUNTS.findIndex((d) => d.id === id);
  if (idx === -1) return { success: false };
  MOCK_DISCOUNTS.splice(idx, 1);
  return { success: true };
}
