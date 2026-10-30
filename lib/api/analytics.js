/**
 * Analytics & Dashboard API Client
 * Connects to NestJS AnalyticsModule endpoints with automatic token refresh.
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

async function authenticatedFetch(url, options = {}) {
  let headers = { ...getAuthHeaders(), ...options.headers };
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { ...options, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message ||
        (res.status === 401 || res.status === 403
          ? 'Session expired or insufficient permissions. Please sign in as an admin or staff member.'
          : `Failed request (${res.status})`);
    throw new Error(message);
  }

  return res.json();
}

/**
 * Fetch executive overview: KPIs, comparative deltas, and time-series data.
 */
export async function getAnalyticsOverview(filters = {}) {
  const query = new URLSearchParams();
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);

  const url = `${BACKEND_URL}/admin/analytics/overview${query.toString() ? `?${query.toString()}` : ''}`;
  return authenticatedFetch(url);
}

/**
 * Fetch top products ranked by units sold and net revenue.
 */
export async function getTopProducts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.limit) query.set('limit', filters.limit);

  const url = `${BACKEND_URL}/admin/analytics/top-products${query.toString() ? `?${query.toString()}` : ''}`;
  return authenticatedFetch(url);
}

/**
 * Fetch top categories by revenue and unit volume.
 */
export async function getTopCategories(filters = {}) {
  const query = new URLSearchParams();
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);
  if (filters.limit) query.set('limit', filters.limit);

  const url = `${BACKEND_URL}/admin/analytics/top-categories${query.toString() ? `?${query.toString()}` : ''}`;
  return authenticatedFetch(url);
}

/**
 * Fetch coupon and discount rule usage analytics.
 */
export async function getCouponAnalytics(filters = {}) {
  const query = new URLSearchParams();
  if (filters.startDate) query.set('startDate', filters.startDate);
  if (filters.endDate) query.set('endDate', filters.endDate);

  const url = `${BACKEND_URL}/admin/analytics/coupons${query.toString() ? `?${query.toString()}` : ''}`;
  return authenticatedFetch(url);
}

/**
 * Fetch operational snapshot: fulfillment funnel, low-stock items, and recent orders.
 */
export async function getOperationalSummary() {
  const url = `${BACKEND_URL}/admin/analytics/operational`;
  return authenticatedFetch(url);
}
