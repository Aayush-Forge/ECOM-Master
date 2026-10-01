/**
 * Payments API client.
 * Connects to NestJS PaymentsController via NEXT_PUBLIC_BACKEND_URL.
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

function normalizePayment(pmt) {
  if (!pmt) return null;
  const customer = pmt.order?.customer;
  const shippingAddr =
    pmt.order?.addresses?.find((a) => a.type === 'shipping') ||
    pmt.order?.addresses?.[0];
  const customerName = customer
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email
    : (shippingAddr?.fullName || 'Guest Customer');

  return {
    ...pmt,
    id: pmt.id,
    orderId: pmt.orderId || pmt.order?.id,
    orderNumber: pmt.order?.orderNumber || `ORD-${pmt.orderId?.slice(0, 8) || '0000'}`,
    customerName,
    amount: Number(pmt.amount ?? 0),
    method: pmt.method || 'Online Payment',
    status: pmt.status || 'CREATED',
    date: pmt.createdAt || new Date().toISOString(),
  };
}

export function getAllPaymentsSync(filter = {}) {
  return [];
}

/**
 * Real staff/admin call: GET /admin/payments
 */
export async function getAllPayments(filter = {}) {
  const query = new URLSearchParams();
  if (filter.status && filter.status !== 'all') {
    query.set('status', filter.status);
  }
  if (filter.page) query.set('page', filter.page);
  if (filter.perPage || filter.per_page) {
    query.set('per_page', filter.perPage || filter.per_page);
  }

  const url = `${BACKEND_URL}/admin/payments${query.toString() ? `?${query.toString()}` : ''}`;
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
          ? 'Session expired or insufficient permissions. Please sign in as an admin or staff member.'
          : `Failed to fetch payments (${res.status})`);
    throw new Error(message);
  }

  const result = await res.json();
  const list = Array.isArray(result) ? result : result.data || [];
  return list.map(normalizePayment);
}

/**
 * Real staff/admin call: GET /admin/payments/order/:orderId
 */
export async function getPaymentByOrderId(orderId) {
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/payments/order/${orderId}`, { headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/payments/order/${orderId}`, { headers });
    }
  }

  if (!res.ok) {
    if (res.status === 404 || res.status === 401 || res.status === 403) return null;
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch payment (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return normalizePayment(data);
}

/**
 * Creates a Razorpay checkout session for an order in payment_pending status
 */
export async function createPaymentSession(orderId) {
  const res = await fetch(`${BACKEND_URL}/payments/create-session`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to initiate payment session (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

/**
 * Verifies Razorpay payment signature and transitions order to paid
 */
export async function verifyPaymentSession({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const res = await fetch(`${BACKEND_URL}/payments/verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Payment verification failed (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}
