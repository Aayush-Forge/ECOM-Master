/**
 * Addresses API client — real backend implementation.
 * Connects to NestJS AddressesModule via NEXT_PUBLIC_BACKEND_URL.
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

export function getAddressesSync() {
  return [];
}

/** Get all saved addresses for the current user. */
export async function getAddresses() {
  const res = await fetch(`${BACKEND_URL}/addresses/me`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return [];
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch addresses (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Add a new address. */
export async function addAddress(data) {
  const res = await fetch(`${BACKEND_URL}/addresses/me`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to create address (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

/** Update an existing address. */
export async function updateAddress(id, data) {
  const res = await fetch(`${BACKEND_URL}/addresses/me/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to update address (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

/** Delete an address. */
export async function deleteAddress(id) {
  const res = await fetch(`${BACKEND_URL}/addresses/me/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to delete address (${res.status})`;
    throw new Error(message);
  }

  return { success: true };
}

/** Set an address as the default (unsets all others). */
export async function setDefaultAddress(id) {
  const res = await fetch(`${BACKEND_URL}/addresses/me/${id}/default`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to set default address (${res.status})`;
    throw new Error(message);
  }

  return { success: true };
}
