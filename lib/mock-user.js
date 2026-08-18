/**
 * Mock current user constant.
 *
 * Change the `role` field to test different user perspectives:
 *   'admin'     → Full access (Rank 3): All admin & staff operations
 *   'editor'    → Editor Employee (Rank 2): /staff/*, /account/*, can process refunds, manage products/discounts
 *   'read_only' → Viewer Employee (Rank 1): /staff/*, /account/*, view-only (no refunds, no product/discount mutations)
 *   'customer'  → Customer (Rank 0): Access to /account/* only
 *
 * When real auth is built, replace this file's export with the
 * authenticated user from your auth provider / session store.
 */
export const currentUser = {
  id: 'usr_001',
  name: 'Aayush Sharma',
  email: 'aayush@sridattam.com',
  phone: '+91 98765 43210',
  role: 'admin',
};
