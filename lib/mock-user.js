/**
 * Mock current user constant.
 *
 * Change the `role` field to test different user perspectives:
 *   'admin'    → Full access to /admin/*, /staff/*, /account/*
 *   'employee' → Access to /staff/*, /account/*
 *   'customer' → Access to /account/* only
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
