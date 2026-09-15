/**
 * Users API client — real backend implementation.
 * Connects to NestJS AdminUsersController via NEXT_PUBLIC_BACKEND_URL.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.access_token || session.token || null;
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function normalizeUser(u) {
  if (!u) return null;
  return {
    ...u,
    id: u.id,
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    isActive: u.isActive,
  };
}

export function getAllUsersSync() {
  return [];
}

/** Get all users for admin table from real backend. */
export async function getAllUsers() {
  const res = await fetch(`${BACKEND_URL}/admin/users`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch users (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : data.data || [];
  return list.map(normalizeUser);
}

/**
 * Update a user's role via real backend.
 * @param {string} userId
 * @param {'admin' | 'editor' | 'read_only' | 'customer'} newRole
 */
export async function updateUserRole(userId, newRole) {
  const normalizedRole = newRole === 'employee' ? 'read_only' : newRole;

  const res = await fetch(`${BACKEND_URL}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role: normalizedRole }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to update user role (${res.status})`;
    throw new Error(message);
  }

  const user = await res.json();
  return { success: true, user: normalizeUser(user) };
}
