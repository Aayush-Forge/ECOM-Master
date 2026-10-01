/**
 * Role Definitions & Navigation for Admin Portal
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
  admin: '/overview',
  editor: '/overview',
  read_only: '/orders',
  employee: '/orders',
};

export const ROLE_NAV_ITEMS = {
  admin: [
    { label: 'Dashboard', href: '/overview', icon: 'LayoutDashboard', group: 'Overview' },
    { label: 'Orders', href: '/orders', icon: 'ClipboardList', group: 'Operations' },
    { label: 'Payments', href: '/payments', icon: 'CreditCard', group: 'Operations' },
    { label: 'Products', href: '/products', icon: 'Package', group: 'Catalog' },
    { label: 'Categories', href: '/categories', icon: 'FolderTree', group: 'Catalog' },
    { label: 'Discounts', href: '/discounts', icon: 'Tags', group: 'Catalog' },
    { label: 'Users', href: '/users', icon: 'Users', group: 'Management' },
    { label: 'Audit Logs', href: '/audit-logs', icon: 'ScrollText', group: 'Management' },
  ],
  editor: [
    { label: 'Dashboard', href: '/overview', icon: 'LayoutDashboard', group: 'Overview' },
    { label: 'Orders', href: '/orders', icon: 'ClipboardList', group: 'Operations' },
    { label: 'Payments', href: '/payments', icon: 'CreditCard', group: 'Operations' },
    { label: 'Products', href: '/products', icon: 'Package', group: 'Catalog' },
    { label: 'Categories', href: '/categories', icon: 'FolderTree', group: 'Catalog' },
    { label: 'Discounts', href: '/discounts', icon: 'Tags', group: 'Catalog' },
  ],
  read_only: [
    { label: 'Orders', href: '/orders', icon: 'ClipboardList', group: 'Operations' },
    { label: 'Payments', href: '/payments', icon: 'CreditCard', group: 'Operations' },
  ],
};

const EDITOR_ALLOWED = [
  '/overview',
  '/orders',
  '/payments',
  '/products',
  '/categories',
  '/discounts',
];

const VIEWER_ALLOWED = ['/orders', '/payments'];

export function getRedirectForRole(role, pathname) {
  if (!role) return '/login';

  const normalized = role.toLowerCase();
  if (normalized === 'customer') {
    return '/login?error=unauthorized';
  }

  if (pathname === '/login') {
    return ROLE_HOME_ROUTES[normalized] || '/overview';
  }

  if (normalized === 'admin') {
    return null; // Admin can access everything
  }

  if (normalized === 'editor') {
    const isAllowed = EDITOR_ALLOWED.some(
      (r) => pathname === r || pathname.startsWith(r + '/'),
    );
    return isAllowed ? null : '/overview';
  }

  if (normalized === 'read_only' || normalized === 'employee') {
    const isAllowed = VIEWER_ALLOWED.some(
      (r) => pathname === r || pathname.startsWith(r + '/'),
    );
    return isAllowed ? null : '/orders';
  }

  return '/login';
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

export function getRoleLabel(role) {
  if (!role || typeof role !== 'string') return 'Staff';
  return ROLE_LABELS[role.toLowerCase()] || role;
}
