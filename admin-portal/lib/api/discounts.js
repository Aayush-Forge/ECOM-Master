/**
 * Discounts / Clubbing Rules API client.
 * Connects to NestJS ClubbingController via NEXT_PUBLIC_BACKEND_URL.
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

function getAuthHeaders(extraToken = null) {
  const token = extraToken || getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function refreshAuthToken() {
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

export async function getAllDiscounts() {
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
    headers,
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
        headers: getAuthHeaders(newToken),
      });
    }
  }

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
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
    headers,
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
        headers: getAuthHeaders(newToken),
      });
    }
  }

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch discount rule (${res.status})`);
  }
  return res.json();
}

export async function createDiscount(data) {
  const payload = {
    name: data.name,
    code: data.code !== undefined && data.code !== '' ? data.code : undefined,
    description: data.description || undefined,
    type: data.type,
    requiredQuantity: Number(data.requiredQuantity || 2),
    fixedPrice: data.fixedPrice !== undefined && data.fixedPrice !== '' ? Number(data.fixedPrice) : undefined,
    percentageOff: data.percentageOff !== undefined && data.percentageOff !== '' ? Number(data.percentageOff) : undefined,
    applicableCategoryId: data.applicableCategoryId || undefined,
    applicableProductIds: data.applicableProductIds || [],
    startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : undefined,
    endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
    usageLimit: data.usageLimit !== undefined && data.usageLimit !== '' ? Number(data.usageLimit) : undefined,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };

  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
        method: 'POST',
        headers: getAuthHeaders(newToken),
        body: JSON.stringify(payload),
      });
    }
  }

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
    code: data.code !== undefined ? (data.code !== '' && data.code !== null ? data.code : null) : undefined,
    description: data.description !== undefined ? data.description : undefined,
    type: data.type,
    requiredQuantity: data.requiredQuantity !== undefined ? Number(data.requiredQuantity) : undefined,
    fixedPrice: data.fixedPrice !== undefined && data.fixedPrice !== '' ? Number(data.fixedPrice) : null,
    percentageOff: data.percentageOff !== undefined && data.percentageOff !== '' ? Number(data.percentageOff) : null,
    applicableCategoryId: data.applicableCategoryId || null,
    applicableProductIds: data.applicableProductIds || undefined,
    startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : null,
    endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
    usageLimit: data.usageLimit !== undefined ? (data.usageLimit !== '' && data.usageLimit !== null ? Number(data.usageLimit) : null) : undefined,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
  };

  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(newToken),
        body: JSON.stringify(payload),
      });
    }
  }

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
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      res = await fetch(`${BACKEND_URL}/clubbing-rules/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(newToken),
      });
    }
  }

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
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/clubbing-rules/bulk-delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids }),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      res = await fetch(`${BACKEND_URL}/clubbing-rules/bulk-delete`, {
        method: 'POST',
        headers: getAuthHeaders(newToken),
        body: JSON.stringify({ ids }),
      });
    }
  }

  if (!res.ok) {
    throw new Error(`Failed to delete discounts (${res.status})`);
  }

  return res.json();
}

export async function bulkUpdateDiscountsStatus(ids, isActive) {
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/clubbing-rules/bulk-status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids, isActive }),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      res = await fetch(`${BACKEND_URL}/clubbing-rules/bulk-status`, {
        method: 'POST',
        headers: getAuthHeaders(newToken),
        body: JSON.stringify({ ids, isActive }),
      });
    }
  }

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
