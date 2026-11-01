/**
 * Storefront Role Definitions & Hierarchy System
 *
 * The storefront is guest-checkout only.
 * Staff/admin operations are routed to the dedicated admin-portal.
 */

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  READ_ONLY: 'read_only',
  CUSTOMER: 'customer',
};

export const ROLE_RANKS = {
  admin: 3,
  editor: 2,
  read_only: 1,
  employee: 1,
  customer: 0,
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  editor: 'Staff Editor',
  read_only: 'Staff Viewer',
  employee: 'Staff Viewer',
  customer: 'Customer',
};

export const ROLE_HOME_ROUTES = {
  admin: '/',
  editor: '/',
  read_only: '/',
  employee: '/',
  customer: '/',
};

export const ROLE_ALLOWED_ROUTE_PREFIXES = {
  admin: ['/'],
  editor: ['/'],
  read_only: ['/'],
  employee: ['/'],
  customer: ['/'],
};

export const ROLE_NAV_ITEMS = {
  customer: [],
  admin: [],
  editor: [],
  read_only: [],
};

export function getRedirectForRole(role, pathname) {
  return '/';
}

export function getRoleRank(role) {
  if (!role || typeof role !== 'string') return 0;
  return ROLE_RANKS[role.toLowerCase()] ?? 0;
}

export function hasRole(userOrRole, minimumRole) {
  const role =
    typeof userOrRole === 'object' && userOrRole !== null
      ? userOrRole.role
      : userOrRole;
  return getRoleRank(role) >= getRoleRank(minimumRole);
}

export function requireRole(minimumRole, userOrRole) {
  if (!hasRole(userOrRole, minimumRole)) {
    const error = new Error('Forbidden: Insufficient privileges.');
    error.status = 403;
    throw error;
  }
  return true;
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role?.toLowerCase()] || 'Customer';
}
