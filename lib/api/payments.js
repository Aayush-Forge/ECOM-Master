/**
 * Payments API client.
 * Connects to NestJS PaymentsController via NEXT_PUBLIC_BACKEND_URL.
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

export function getAllPaymentsSync(filter = {}) {
  return [];
}

export async function getAllPayments(filter = {}) {
  return [];
}

export async function getPaymentByOrderId(orderId) {
  return null;
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
