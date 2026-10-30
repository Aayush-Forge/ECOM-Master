/**
 * Shipping Templates API client.
 * Connects to NestJS ShippingController via NEXT_PUBLIC_BACKEND_URL.
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

export async function getAllShippingTemplates(includeDisabled = true) {
  const res = await fetch(
    `${BACKEND_URL}/shipping-templates?includeDisabled=${includeDisabled}`,
    {
      headers: getAuthHeaders(),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch shipping templates (${res.status})`);
  }
  return res.json();
}

export async function getShippingTemplate(id) {
  const res = await fetch(`${BACKEND_URL}/shipping-templates/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch shipping template (${res.status})`);
  }
  return res.json();
}

export async function createShippingTemplate(data) {
  const res = await fetch(`${BACKEND_URL}/shipping-templates`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.message || 'Failed to create shipping template';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return res.json();
}

export async function updateShippingTemplate(id, data) {
  const res = await fetch(`${BACKEND_URL}/shipping-templates/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.message || 'Failed to update shipping template';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return res.json();
}

export async function setDefaultShippingTemplate(id) {
  const res = await fetch(`${BACKEND_URL}/shipping-templates/${id}/set-default`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.message || 'Failed to set default shipping template';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return res.json();
}

export async function deleteShippingTemplate(id) {
  const res = await fetch(`${BACKEND_URL}/shipping-templates/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.message || 'Failed to delete shipping template';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return res.json();
}
