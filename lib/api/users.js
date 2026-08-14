/**
 * Users API client — mock implementation.
 *
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend user endpoints are ready.
 */

let MOCK_USERS = [
  { id: 'usr_001', name: 'Aayush Sharma', email: 'aayush@sridattam.com', role: 'admin', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'usr_002', name: 'Priya Patel', email: 'priya.patel@sridattam.com', role: 'employee', createdAt: '2025-02-15T00:00:00Z' },
  { id: 'usr_003', name: 'Rahul Verma', email: 'rahul.verma@sridattam.com', role: 'employee', createdAt: '2025-03-01T00:00:00Z' },
  { id: 'usr_004', name: 'Meera Joshi', email: 'meera.joshi@example.com', role: 'customer', createdAt: '2025-04-10T00:00:00Z' },
  { id: 'usr_005', name: 'Karan Singh', email: 'karan.singh@example.com', role: 'customer', createdAt: '2025-04-22T00:00:00Z' },
  { id: 'usr_006', name: 'Ananya Reddy', email: 'ananya.r@example.com', role: 'customer', createdAt: '2025-05-05T00:00:00Z' },
  { id: 'usr_007', name: 'Vikram Desai', email: 'vikram.d@example.com', role: 'customer', createdAt: '2025-05-18T00:00:00Z' },
  { id: 'usr_008', name: 'Sonia Gupta', email: 'sonia.g@example.com', role: 'customer', createdAt: '2025-06-02T00:00:00Z' },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAllUsersSync() {
  return [...MOCK_USERS];
}

/** Get all users for admin table. */
export async function getAllUsers() {
  return getAllUsersSync();
}

/**
 * Update a user's role.
 * @param {string} userId
 * @param {'admin' | 'employee' | 'customer'} newRole
 */
export async function updateUserRole(userId, newRole) {
  // return fetch(`/api/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) }).then(r => r.json());
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) return { success: false, error: 'User not found' };
  user.role = newRole;
  return { success: true, user };
}
