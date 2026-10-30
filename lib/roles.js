/**
 * Storefront Role Definitions & Hierarchy System
 *
 * The customer storefront website only serves customer-facing routes (/account/*).
 * All admin/staff operations live in the separate admin-portal application.
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
  admin: 'Customer',
  editor: 'Customer',
  read_only: 'Customer',
  employee: 'Customer',
  customer: 'Customer',
};

export const ROLE_HOME_ROUTES = {
  admin: '/account',
  editor: '/account',
  read_only: '/account',
  employee: '/account',
  customer: '/account',
};

export const ROLE_ALLOWED_ROUTE_PREFIXES = {
  admin: ['/account'],
  editor: ['/account'],
  read_only: ['/account'],
  employee: ['/account'],
  customer: ['/account'],
};

export const ROLE_NAV_ITEMS = {
  customer: [
    { label: 'Orders', href: '/account/orders', icon: 'ClipboardList', group: 'Account' },
    { label: 'Profile', href: '/account/profile', icon: 'User', group: 'Account' },
    { label: 'Addresses', href: '/account/addresses', icon: 'MapPin', group: 'Account' },
  ],
  admin: [
    { label: 'Orders', href: '/account/orders', icon: 'ClipboardList', group: 'Account' },
    { label: 'Profile', href: '/account/profile', icon: 'User', group: 'Account' },
    { label: 'Addresses', href: '/account/addresses', icon: 'MapPin', group: 'Account' },
  ],
  editor: [
    { label: 'Orders', href: '/account/orders', icon: 'ClipboardList', group: 'Account' },
    { label: 'Profile', href: '/account/profile', icon: 'User', group: 'Account' },
    { label: 'Addresses', href: '/account/addresses', icon: 'MapPin', group: 'Account' },
  ],
  read_only: [
    { label: 'Orders', href: '/account/orders', icon: 'ClipboardList', group: 'Account' },
    { label: 'Profile', href: '/account/profile', icon: 'User', group: 'Account' },
    { label: 'Addresses', href: '/account/addresses', icon: 'MapPin', group: 'Account' },
  ],
};

export function getRedirectForRole(role, pathname) {
  if (!role) return '/login';
  if (pathname.startsWith('/account')) return null;
  return '/account';
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
  return 'Customer';
}
