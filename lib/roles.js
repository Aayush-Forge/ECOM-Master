/**
 * Role Definitions & Hierarchy System
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH for all role routing, navigation, and guards.
 * Every layout, guard, redirect, and navigation component MUST import
 * from this file. Do NOT hardcode role→destination mappings elsewhere.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 4-Tier Hierarchy:
 *   admin:     Rank 3 (highest, full access under /admin/*)
 *   editor:    Rank 2 (Editor Employee - catalog CRUD, orders, payments under /staff/*)
 *   read_only: Rank 1 (Viewer Employee - orders & payments view only under /staff/*)
 *   customer:  Rank 0 (storefront customer under /account/*)
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
  // Normalize legacy employee to read_only
  employee: 1,
  customer: 0,
};

export const ROLE_LABELS = {
  admin: 'Admin',
  editor: 'Editor Employee',
  read_only: 'Viewer Employee',
  employee: 'Viewer Employee',
  customer: 'Customer',
};

// ═══════════════════════════════════════════════════════════════════════
// ROLE → HOME ROUTE (where each role lands after login)
// ═══════════════════════════════════════════════════════════════════════

export const ROLE_HOME_ROUTES = {
  admin: '/admin/overview',
  editor: '/staff/overview',
  read_only: '/staff/orders',
  employee: '/staff/orders',
  customer: '/account',
};

// ═══════════════════════════════════════════════════════════════════════
// ROLE → ALLOWED ROUTE PREFIXES (which URL trees each role can access)
// ═══════════════════════════════════════════════════════════════════════

export const ROLE_ALLOWED_ROUTE_PREFIXES = {
  admin: ['/admin'],
  editor: ['/staff'],
  read_only: ['/staff'],
  employee: ['/staff'],
  customer: ['/account'],
};

// ═══════════════════════════════════════════════════════════════════════
// VIEWER (READ_ONLY) ALLOWLIST within /staff
// Viewer has access ONLY to orders and payments (no products, discounts, or overview).
// ═══════════════════════════════════════════════════════════════════════

export const VIEWER_ALLOWED_STAFF_ROUTES = [
  '/staff/orders',
  '/staff/payments',
];

// ═══════════════════════════════════════════════════════════════════════
// ROLE → NAV ITEMS (what each role sees in the sidebar/nav)
// Every navigation component MUST render from this, never hardcode.
// ═══════════════════════════════════════════════════════════════════════

export const ROLE_NAV_ITEMS = {
  admin: [
    { label: 'Dashboard', href: '/admin/overview', icon: 'LayoutDashboard', group: 'Overview' },
    { label: 'Orders', href: '/admin/orders', icon: 'ClipboardList', group: 'Operations' },
    { label: 'Payments', href: '/admin/payments', icon: 'CreditCard', group: 'Operations' },
    { label: 'Products', href: '/admin/products', icon: 'Package', group: 'Catalog' },
    { label: 'Discounts', href: '/admin/discounts', icon: 'Tags', group: 'Catalog' },
    { label: 'Users', href: '/admin/users', icon: 'Users', group: 'Management' },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'ScrollText', group: 'Management' },
  ],
  editor: [
    { label: 'Dashboard', href: '/staff/overview', icon: 'LayoutDashboard', group: 'Overview' },
    { label: 'Orders', href: '/staff/orders', icon: 'ClipboardList', group: 'Operations' },
    { label: 'Payments', href: '/staff/payments', icon: 'CreditCard', group: 'Operations' },
    { label: 'Products', href: '/staff/products', icon: 'Package', group: 'Catalog' },
    { label: 'Discounts', href: '/staff/discounts', icon: 'Tags', group: 'Catalog' },
  ],
  read_only: [
    { label: 'Orders', href: '/staff/orders', icon: 'ClipboardList', group: 'Operations' },
    { label: 'Payments', href: '/staff/payments', icon: 'CreditCard', group: 'Operations' },
  ],
  customer: [
    { label: 'Orders', href: '/account/orders', icon: 'ClipboardList', group: 'Account' },
    { label: 'Profile', href: '/account/profile', icon: 'User', group: 'Account' },
    { label: 'Addresses', href: '/account/addresses', icon: 'MapPin', group: 'Account' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// ROUTE GUARD LOGIC (single function used by all layouts)
// Returns null if user is allowed, or a redirect URL string.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Given a user's role and the current pathname, determine if the user
 * should be redirected, and where to.
 *
 * @param {string|null} role - The user's role, or null if not logged in
 * @param {string} pathname - The current URL pathname
 * @returns {string|null} - Redirect URL, or null if allowed
 */
export function getRedirectForRole(role, pathname) {
  if (!role) return '/login';

  // /account is accessible to all authenticated users
  if (pathname.startsWith('/account')) return null;

  const allowedPrefixes = ROLE_ALLOWED_ROUTE_PREFIXES[role];
  if (!allowedPrefixes) return '/login';

  // Check if user is in one of their allowed route trees
  const isInAllowedArea = allowedPrefixes.some(prefix => pathname.startsWith(prefix));
  if (!isInAllowedArea) return ROLE_HOME_ROUTES[role] || '/';

  // Viewer (read_only / employee) restriction within /staff
  if ((role === 'read_only' || role === 'employee') && pathname.startsWith('/staff')) {
    const isAllowed = VIEWER_ALLOWED_STAFF_ROUTES.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );
    if (!isAllowed) return '/staff/orders';
  }

  return null; // User is allowed on this route
}

// ═══════════════════════════════════════════════════════════════════════
// LEGACY HELPER FUNCTIONS (preserved for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns integer rank for a given role name.
 * @param {string} role
 * @returns {number}
 */
export function getRoleRank(role) {
  if (!role || typeof role !== 'string') return 0;
  return ROLE_RANKS[role.toLowerCase()] ?? 0;
}

/**
 * Checks if a user qualifies for a required minimum role.
 * User qualifies if their role rank is >= the required role rank.
 *
 * @param {string | { role: string }} userOrRole
 * @param {string} minimumRole
 * @returns {boolean}
 */
export function hasRole(userOrRole, minimumRole) {
  const role =
    typeof userOrRole === 'object' && userOrRole !== null
      ? userOrRole.role
      : userOrRole;
  return getRoleRank(role) >= getRoleRank(minimumRole);
}

/**
 * Enforces a required minimum role, throwing an error with status 403 if unauthorized.
 *
 * @param {string} minimumRole - e.g. 'editor', 'admin', 'read_only'
 * @param {string | { role: string }} userOrRole - User object or role string
 * @returns {boolean}
 */
export function requireRole(minimumRole, userOrRole) {
  if (!hasRole(userOrRole, minimumRole)) {
    const role =
      typeof userOrRole === 'object' && userOrRole !== null
        ? userOrRole.role
        : userOrRole;
    const error = new Error(
      `Forbidden: Requires at least '${minimumRole}' role. Current role '${role || 'unknown'}' does not have sufficient permissions.`
    );
    error.status = 403;
    error.code = 'FORBIDDEN_INSUFFICIENT_ROLE';
    throw error;
  }
  return true;
}

/**
 * Returns human-readable label for a role (e.g. "Editor Employee", "Viewer Employee").
 * @param {string} role
 * @returns {string}
 */
export function getRoleLabel(role) {
  if (!role || typeof role !== 'string') return 'Customer';
  return ROLE_LABELS[role.toLowerCase()] || role;
}
