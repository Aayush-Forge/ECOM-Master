/**
 * Products API client (admin CRUD) — real backend implementation.
 * Connects to NestJS backend endpoints via NEXT_PUBLIC_BACKEND_URL.
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

function normalizeProduct(p) {
  if (!p) return null;
  return {
    ...p,
    price: Number(p.salePrice ?? p.basePrice ?? 0),
    basePrice: Number(p.basePrice ?? 0),
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    stock: p.stockQuantity ?? 0,
    stockQuantity: p.stockQuantity ?? 0,
    category: p.category?.name || (typeof p.category === 'string' ? p.category : ''),
    categoryDetails: typeof p.category === 'object' ? p.category : null,
    imageUrl:
      p.images?.[0] ||
      'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300',
  };
}

export function getAdminProductsSync() {
  return [];
}

export function getAdminProductByIdSync(id) {
  return null;
}

export async function getAdminProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.perPage || params.per_page) {
    query.set('per_page', params.perPage || params.per_page);
  }
  const url = `${BACKEND_URL}/all-products${query.toString() ? `?${query.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch products (${res.status})`;
    throw new Error(message);
  }

  const result = await res.json();
  const list = Array.isArray(result) ? result : result.data || [];
  return list.map(normalizeProduct);
}

export async function getAdminProductById(id) {
  const res = await fetch(`${BACKEND_URL}/products/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to fetch product (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return normalizeProduct(data);
}

export async function getProductCategories() {
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

export async function createProduct(data) {
  const payload = {
    sku: data.sku,
    title: data.title,
    slug:
      data.slug ||
      data.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    description: data.description ?? '',
    shortDescription: data.shortDescription ?? '',
    basePrice:
      data.basePrice !== undefined
        ? Number(data.basePrice)
        : Number(data.price || 0),
    salePrice:
      data.salePrice !== undefined && data.salePrice !== null
        ? Number(data.salePrice)
        : undefined,
    categoryId: data.categoryId || data.category,
    stockQuantity:
      data.stockQuantity !== undefined
        ? Number(data.stockQuantity)
        : data.stock !== undefined
          ? Number(data.stock)
          : 50,
    images: data.images || (data.imageUrl ? [data.imageUrl] : []),
    status: data.status || 'active',
  };

  const res = await fetch(`${BACKEND_URL}/admin/create-products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to create product (${res.status})`;
    throw new Error(message);
  }

  const created = await res.json();
  return normalizeProduct(created);
}

export async function updateProduct(id, data) {
  const payload = { ...data };
  if (data.price !== undefined && data.basePrice === undefined) {
    payload.basePrice = Number(data.price);
  }
  if (data.stock !== undefined && data.stockQuantity === undefined) {
    payload.stockQuantity = Number(data.stock);
  }
  if (data.imageUrl && !data.images) {
    payload.images = [data.imageUrl];
  }

  const res = await fetch(`${BACKEND_URL}/admin/update-products/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to update product (${res.status})`;
    throw new Error(message);
  }

  const updated = await res.json();
  return normalizeProduct(updated);
}

export async function deleteProduct(id) {
  const res = await fetch(`${BACKEND_URL}/admin/delete-products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to delete product (${res.status})`;
    throw new Error(message);
  }

  return res.json().catch(() => ({ success: true }));
}
