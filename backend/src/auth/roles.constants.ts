export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  READ_ONLY: 'read_only',
  CUSTOMER: 'customer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES] | string;

export const ROLE_RANKS: Record<string, number> = {
  admin: 3,
  editor: 2,
  read_only: 1,
  // Normalize legacy employee to read_only
  employee: 1,
  customer: 0,
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor Employee',
  read_only: 'Viewer Employee',
  employee: 'Viewer Employee',
  customer: 'Customer',
};

/**
 * Returns integer rank for a given role name.
 * admin: 3, editor: 2, read_only/employee: 1, customer: 0
 */
export function getRoleRank(role?: string): number {
  if (!role || typeof role !== 'string') return 0;
  return ROLE_RANKS[role.toLowerCase()] ?? 0;
}

/**
 * Checks if a user's role satisfies the required minimum role rank.
 */
export function hasRole(userRole?: string, minimumRole?: string): boolean {
  if (!minimumRole) return true;
  return getRoleRank(userRole) >= getRoleRank(minimumRole);
}
