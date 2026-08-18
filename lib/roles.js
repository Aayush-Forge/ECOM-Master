/**
 * Role Definitions & Hierarchy System
 *
 * 3-Tier Hierarchy:
 *   admin: Rank 3 (highest, full access)
 *   editor: Rank 2 (Editor Employee - refunds, product CRUD, discounts CRUD)
 *   read_only: Rank 1 (Viewer Employee - view only)
 *   customer: Rank 0 (storefront customer)
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
