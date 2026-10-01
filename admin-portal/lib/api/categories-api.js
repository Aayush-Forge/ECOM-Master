/**
 * Categories API client (admin CRUD) — connects to NestJS CategoriesController.
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
 * Fetch all categories. Public endpoint.
 * Returns Array<{ id: string, name: string, slug: string, parentId: string | null }>
 */
export async function getAllCategories() {
  const res = await fetch(`${BACKEND_URL}/admin/all-categories`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch categories (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

/**
 * Fetch single category by ID. Public endpoint.
 */
export async function getCategoryById(id) {
  const res = await fetch(`${BACKEND_URL}/admin/categories/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch category (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

/**
 * Create category. Requires editor role or higher.
 * @param {{ name: string, slug: string, parentId?: string | null }} data
 */
export async function createCategory(data) {
  const payload = {
    name: data.name.trim(),
    slug: data.slug.trim(),
  };

  if (data.parentId) {
    payload.parentId = data.parentId;
  }

  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/create-categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/create-categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to create category (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

/**
 * Update category. Requires editor role or higher.
 * @param {string} id
 * @param {{ name?: string, slug?: string, parentId?: string | null }} data
 */
export async function updateCategory(id, data) {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.slug !== undefined) payload.slug = data.slug.trim();
  if (data.parentId !== undefined) {
    payload.parentId = data.parentId || undefined;
  }

  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/update-categories/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/update-categories/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to update category (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

/**
 * Delete category. Requires editor role or higher.
 * @param {string} id
 */
export async function deleteCategory(id) {
  let headers = getAuthHeaders();
  let res = await fetch(`${BACKEND_URL}/admin/delete-categories/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (res.status === 401) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(`${BACKEND_URL}/admin/delete-categories/${id}`, {
        method: 'DELETE',
        headers,
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to delete category (${res.status})`;
    throw new Error(message);
  }

  return res.json().catch(() => ({ success: true }));
}
