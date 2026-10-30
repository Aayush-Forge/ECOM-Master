/**
 * Admin Customers API Client
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    let raw = localStorage.getItem('auth_session');
    if (!raw) {
      const match = document.cookie.match(/(?:^|;\s*)sd_auth_session=([^;]+)/);
      if (match) {
        try {
          raw = decodeURIComponent(match[1]);
        } catch {}
      }
    }
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

/**
 * Real staff/admin call: GET /admin/customers
 */
export async function getAdminCustomers(filter = {}) {
  const query = new URLSearchParams();
  if (filter.search) query.set('search', filter.search.trim());
  if (filter.page) query.set('page', filter.page);
  if (filter.perPage || filter.per_page) {
    query.set('perPage', filter.perPage || filter.per_page);
  }
  if (filter.sortBy) query.set('sortBy', filter.sortBy);
  if (filter.sortOrder) query.set('sortOrder', filter.sortOrder);

  const url = `${BACKEND_URL}/admin/customers${query.toString() ? `?${query.toString()}` : ''}`;
  let headers = getAuthHeaders();
  let res = await fetch(url, { headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message ||
        (res.status === 401 || res.status === 403
          ? 'Session expired or insufficient permissions. Please sign in as an admin.'
          : `Failed to fetch customers (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}

/**
 * Real staff/admin call: GET /admin/customers/:phoneKey
 */
export async function getAdminCustomerByPhoneKey(phoneKey, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.perPage || params.per_page) {
    query.set('perPage', params.perPage || params.per_page);
  }

  const url = `${BACKEND_URL}/admin/customers/${encodeURIComponent(phoneKey)}${query.toString() ? `?${query.toString()}` : ''}`;
  let headers = getAuthHeaders();
  let res = await fetch(url, { headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message ||
        (res.status === 404
          ? 'Customer not found'
          : `Failed to fetch customer (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}
