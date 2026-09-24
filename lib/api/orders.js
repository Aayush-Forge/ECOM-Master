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
    discount: Number(order.discountTotal ?? order.discount ?? 0),
    discountTotal: Number(order.discountTotal ?? order.discount ?? 0),
    shipping: Number(order.shippingTotal ?? order.shippingCost ?? order.shipping ?? 0),
    shippingTotal: Number(order.shippingTotal ?? order.shippingCost ?? order.shipping ?? 0),
    total: Number(order.grandTotal ?? order.total ?? 0),
    grandTotal: Number(order.grandTotal ?? order.total ?? 0),
    items: (order.items || []).map((item) => ({
      ...item,
      name: item.titleSnapshot || item.title || '',
      title: item.titleSnapshot || item.title || '',
      sku: item.skuSnapshot || item.sku || '',
      price: Number(item.unitPriceSnapshot ?? item.unitPrice ?? 0),
      unitPrice: Number(item.unitPriceSnapshot ?? item.unitPrice ?? 0),
      regular_price: Number(item.product?.basePrice ?? item.unitPriceSnapshot ?? item.unitPrice ?? 0),
      lineTotal: Number(
        item.lineTotal ?? (item.unitPriceSnapshot ?? item.unitPrice ?? 0) * (item.quantity ?? 1),
      ),
      total: Number(
        item.lineTotal ?? (item.unitPriceSnapshot ?? item.unitPrice ?? 0) * (item.quantity ?? 1),
      ),
      imageUrl:
        item.product?.images?.[0] ||
        item.imageUrl ||
        'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300',
      image: {
        src:
          item.product?.images?.[0] ||
          item.imageUrl ||
          'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300',
      },
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
 * Real call: GET /orders/:id (accessible for guest checkout confirmation & authenticated customer/admin)
 */
export async function getOrderById(id) {
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/orders/${id}`, { headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/orders/${id}`, { headers });
    }
  }

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
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/orders/me/${id}`, { headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/orders/me/${id}`, { headers });
    }
  }

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
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/orders/me/by-number/${cleanNumber}`, { headers });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/orders/me/by-number/${cleanNumber}`, { headers });
    }
  }

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
 * Public 2-factor order tracking by order number and phone number (or email).
 * Accessible to guests and authenticated users alike.
 */
export async function trackOrder({ orderNumber, phone, email }) {
  const res = await fetch(`${BACKEND_URL}/orders/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: (orderNumber || '').trim(),
      phone: (phone || '').trim(),
      email: email ? email.trim() : undefined,
    }),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to track order (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return normalizeOrder(data);
}

/**
 * Real call: PATCH /admin/orders/:id/status
 * Backend is the single source of truth for legal transitions.
 */
export async function updateOrderStatus(orderId, toStatus, note) {
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ toStatus, note }),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ toStatus, note }),
      });
    }
  }

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

const ALLOWED_TRANSITIONS = {
  payment_pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export async function getValidTransitions(currentStatus) {
  if (!currentStatus) return [];
  return ALLOWED_TRANSITIONS[currentStatus.toLowerCase()] || [];
}

// ===========================================================================
/**
 * Real staff/admin call: GET /admin/orders
 */
export async function getAllOrders(filter = {}) {
  const query = new URLSearchParams();
  if (filter.status && filter.status !== 'all') {
    query.set('status', filter.status);
  }
  if (filter.page) query.set('page', filter.page);
  if (filter.perPage || filter.per_page) {
    query.set('per_page', filter.perPage || filter.per_page);
  }
  if (filter.search) query.set('search', filter.search);

  const url = `${BACKEND_URL}/admin/orders${query.toString() ? `?${query.toString()}` : ''}`;
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
          : `Failed to fetch orders (${res.status})`);
    throw new Error(message);
  }

  const result = await res.json();
  const list = Array.isArray(result) ? result : result.data || [];
  return list.map(normalizeOrder);
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

/**
 * Place a new order snapshotting line items
 */
export async function createOrder({
  customerId,
  items,
  shippingAddress,
  billingAddress,
  couponCode,
  shippingTotal,
}) {
  const res = await fetch(`${BACKEND_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      customerId,
      items,
      shippingAddress,
      billingAddress,
      couponCode,
      shippingTotal,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to create order (${res.status})`;
    throw new Error(message);
  }

  const order = await res.json();
  return normalizeOrder(order);
}

// TODO: mock — no backend endpoint yet, see payments module
export async function initiateRefund(orderId, amount, reason) {
  return {
    success: true,
    message: `Refund of ₹${amount} initiated for order ${orderId}. Reason: ${reason}`,
  };
}

