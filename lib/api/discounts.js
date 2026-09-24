/**
 * Discounts / Clubbing Rules API client.
 * Connects to NestJS ClubbingController via NEXT_PUBLIC_BACKEND_URL.
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

export async function getAllDiscounts() {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch discount rules (${res.status})`);
  }
  return res.json();
}

export function getAllDiscountsSync() {
  return [];
}

export function getDiscountByIdSync(id) {
  return null;
}

export async function getDiscountById(id) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch discount rule (${res.status})`);
  }
  return res.json();
}

export async function createDiscount(data) {
  const payload = {
    name: data.name,
    description: data.description || undefined,
    type: data.type,
    requiredQuantity: Number(data.requiredQuantity || 2),
    fixedPrice: data.fixedPrice !== undefined && data.fixedPrice !== '' ? Number(data.fixedPrice) : undefined,
    percentageOff: data.percentageOff !== undefined && data.percentageOff !== '' ? Number(data.percentageOff) : undefined,
    applicableCategoryId: data.applicableCategoryId || undefined,
    applicableProductIds: data.applicableProductIds || [],
    startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : undefined,
    endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };

  const res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to create discount (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function updateDiscount(id, data) {
  const payload = {
    name: data.name,
    description: data.description !== undefined ? data.description : undefined,
    type: data.type,
    requiredQuantity: data.requiredQuantity !== undefined ? Number(data.requiredQuantity) : undefined,
    fixedPrice: data.fixedPrice !== undefined && data.fixedPrice !== '' ? Number(data.fixedPrice) : null,
    percentageOff: data.percentageOff !== undefined && data.percentageOff !== '' ? Number(data.percentageOff) : null,
    applicableCategoryId: data.applicableCategoryId || null,
    applicableProductIds: data.applicableProductIds || undefined,
    startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : null,
    endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
  };

  const res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to update discount (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function deleteDiscount(id) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to delete discount (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function bulkDeleteDiscounts(ids) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/bulk-delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete discounts (${res.status})`);
  }

  return res.json();
}

export async function bulkUpdateDiscountsStatus(ids, isActive) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/bulk-status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids, isActive }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update discounts status (${res.status})`);
  }

  return res.json();
}

export async function calculateCartDiscount(cartItems) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartItems: cartItems.map((item) => ({
        productId: item.productId || item.product_id || item.id,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || item.salePrice || item.basePrice || 0),
      })),
    }),
  });

  if (!res.ok) {
    return { discountTotal: 0 };
  }

  return res.json();
}
