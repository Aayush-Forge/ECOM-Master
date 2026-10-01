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

async function refreshAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.refreshToken && !session?.refresh_token) return null;
    const refreshToken = session.refreshToken || session.refresh_token;

    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;

    session.access_token = data.access_token;
    localStorage.setItem('auth_session', JSON.stringify(session));
    window.dispatchEvent(new Event('auth-change'));
    return data.access_token;
  } catch {
    return null;
  }
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
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/users`, { headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/users`, { headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message ||
        (res.status === 401
          ? 'Session expired or unauthorized. Please sign in as an admin.'
          : `Failed to fetch users (${res.status})`);
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
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role: normalizedRole }),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: normalizedRole }),
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message ||
        (res.status === 401
          ? 'Session expired or unauthorized. Please sign in as an admin.'
          : `Failed to update user role (${res.status})`);
    throw new Error(message);
  }

  const user = await res.json();
  return { success: true, user: normalizeUser(user) };
}

/**
 * Create a new user account with any role.
 * Requires admin role.
 * @param {{ email: string, password: string, firstName: string, lastName: string, role: 'admin' | 'editor' | 'read_only' | 'customer' }} data
 */
export async function createUser(data) {
  const bodyPayload = {
    email: data.email?.trim(),
    password: data.password,
    firstName: data.firstName?.trim(),
    lastName: data.lastName?.trim(),
    role: data.role,
  };

  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message ||
        (res.status === 401
          ? 'Session expired or unauthorized. Please sign in as an admin.'
          : `Failed to create user (${res.status})`);
    throw new Error(message);
  }

  const user = await res.json();
  return normalizeUser(user);
}

