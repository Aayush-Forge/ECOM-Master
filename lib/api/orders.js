/**
 * Orders API client.
 * Real backend calls for order retrieval and status transitions via NestJS OrdersModule.
 * Stubs for unmigrated domains are flagged with TODO: mock comments.
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

function normalizeOrder(order) {
  if (!order) return null;
  const shippingAddr =
    order.addresses?.find((a) => a.type === 'shipping') ||
    order.addresses?.[0] ||
    order.shippingAddress ||
    null;

  return {
    ...order,
    orderNumber: order.orderNumber || `ORD-${order.id?.slice(0, 8) || '0000'}`,
    date: order.createdAt || order.placedAt || order.date || new Date().toISOString(),
    subtotal: Number(order.subtotal ?? order.total ?? 0),
    shipping: Number(order.shippingTotal ?? order.shippingCost ?? order.shipping ?? 0),
    total: Number(order.grandTotal ?? order.total ?? 0),
    items: (order.items || []).map((item) => ({
      ...item,
      title: item.titleSnapshot || item.title || '',
      sku: item.skuSnapshot || item.sku || '',
      unitPrice: Number(item.unitPriceSnapshot ?? item.unitPrice ?? 0),
      lineTotal: Number(
        item.lineTotal ?? (item.unitPriceSnapshot ?? item.unitPrice ?? 0) * (item.quantity ?? 1),
      ),
      imageUrl:
        item.product?.images?.[0] ||
        item.imageUrl ||
        'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300',
    })),
    shippingAddress: shippingAddr
      ? {
          name:
            shippingAddr.fullName ||
            shippingAddr.name ||
            `${shippingAddr.firstName || ''} ${shippingAddr.lastName || ''}`.trim(),
          line1: shippingAddr.addressLine1 || shippingAddr.address1 || shippingAddr.line1 || '',
          line2: shippingAddr.addressLine2 || shippingAddr.address2 || shippingAddr.line2 || '',
          city: shippingAddr.city || '',
          state: shippingAddr.state || '',
          pincode: shippingAddr.postalCode || shippingAddr.pincode || '',
          phone: shippingAddr.phone || '',
        }
      : null,
    customer: order.customer
      ? {
          id: order.customer.id,
          name:
            `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() ||
            order.customer.email,
          email: order.customer.email,
        }
      : order.user
        ? {
            id: order.user.id,
            name:
              `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() ||
              order.user.email,
            email: order.user.email,
          }
        : null,
  };
}

/**
 * Real call: GET /admin/orders/:id
 */
export async function getOrderById(id) {
  const res = await fetch(`${BACKEND_URL}/admin/orders/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch order (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return normalizeOrder(data);
}

/**
 * Real customer-scoped call: GET /orders/me/:id
 */
export async function getMyOrderById(id) {
  const res = await fetch(`${BACKEND_URL}/orders/me/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 404 || res.status === 403) return null;
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch order (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return normalizeOrder(data);
}

/**
 * Real customer-scoped call: GET /orders/me/by-number/:orderNumber
 */
export async function getMyOrderByNumber(orderNumber) {
  const cleanNumber = encodeURIComponent(String(orderNumber || '').trim());
  const res = await fetch(`${BACKEND_URL}/orders/me/by-number/${cleanNumber}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 404 || res.status === 403) return null;
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch order (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return normalizeOrder(data);
}

export function getOrderByIdSync(id) {
  return null;
}

/**
 * Real call: PATCH /admin/orders/:id/status
 * Backend is the single source of truth for legal transitions.
 */
export async function updateOrderStatus(orderId, toStatus, note) {
  const res = await fetch(`${BACKEND_URL}/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ toStatus, note }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to update order status (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return normalizeOrder(data);
}

/**
 * Candidate transition target statuses for dropdown selection.
 * Note: Client-side validation map removed per spec; backend enforces valid transitions.
 */
export async function getValidTransitions(currentStatus) {
  const ALL_STATUSES = [
    'payment_pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];
  return ALL_STATUSES.filter(
    (s) => s.toLowerCase() !== (currentStatus || '').toLowerCase(),
  );
}

// ===========================================================================
// Unmigrated endpoints (flagged with TODO: mock)
// ===========================================================================

export async function getAllOrders(filter = {}) {
  return [];
}

export function getAllOrdersSync(filter = {}) {
  return [];
}

/**
 * Real customer-scoped call: GET /orders/me
 */
export async function getMyOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.perPage || params.per_page) {
    query.set('per_page', params.perPage || params.per_page);
  }
  const url = `${BACKEND_URL}/orders/me${query.toString() ? `?${query.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return [];
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch orders (${res.status})`;
    throw new Error(message);
  }

  const result = await res.json();
  const list = Array.isArray(result) ? result : result.data || [];
  return list.map(normalizeOrder);
}

export function getMyOrdersSync() {
  return [];
}

// TODO: mock — no backend endpoint yet, see payments module
export async function initiateRefund(orderId, amount, reason) {
  return {
    success: true,
    message: `Refund of ₹${amount} initiated for order ${orderId}. Reason: ${reason}`,
  };
}
