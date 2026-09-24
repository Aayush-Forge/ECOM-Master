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
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
    shortDescription: p.shortDescription || '',
    weight: p.weight != null ? Number(p.weight) : null,
    length: p.length != null ? Number(p.length) : null,
    width: p.width != null ? Number(p.width) : null,
    height: p.height != null ? Number(p.height) : null,
    stock: p.stockQuantity ?? 0,
    stockQuantity: p.stockQuantity ?? 0,
    category: p.category?.name || (typeof p.category === 'string' ? p.category : ''),
    categoryDetails: typeof p.category === 'object' ? p.category : null,
    images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
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
    compareAtPrice:
      data.compareAtPrice !== undefined && data.compareAtPrice !== null && data.compareAtPrice !== ''
        ? Number(data.compareAtPrice)
        : undefined,
    salePrice:
      data.salePrice !== undefined && data.salePrice !== null && data.salePrice !== ''
        ? Number(data.salePrice)
        : undefined,
    weight:
      data.weight !== undefined && data.weight !== null && data.weight !== ''
        ? Number(data.weight)
        : undefined,
    length:
      data.length !== undefined && data.length !== null && data.length !== ''
        ? Number(data.length)
        : undefined,
    width:
      data.width !== undefined && data.width !== null && data.width !== ''
        ? Number(data.width)
        : undefined,
    height:
      data.height !== undefined && data.height !== null && data.height !== ''
        ? Number(data.height)
        : undefined,
    categoryId: data.categoryId || data.category,
    stockQuantity:
      data.stockQuantity !== undefined
        ? Number(data.stockQuantity)
        : data.stock !== undefined
          ? Number(data.stock)
          : 50,
    images: Array.isArray(data.images)
      ? data.images.filter((url) => Boolean(url && url.trim()))
      : data.imageUrl
        ? [data.imageUrl]
        : [],
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
  const payload = {};
  if (data.sku !== undefined) payload.sku = data.sku;
  if (data.title !== undefined) payload.title = data.title;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.description !== undefined) payload.description = data.description;
  if (data.shortDescription !== undefined) payload.shortDescription = data.shortDescription;
  if (data.basePrice !== undefined) payload.basePrice = Number(data.basePrice);
  else if (data.price !== undefined) payload.basePrice = Number(data.price);
  if (data.salePrice !== undefined) {
    payload.salePrice = data.salePrice !== null && data.salePrice !== '' ? Number(data.salePrice) : null;
  }
  if (data.compareAtPrice !== undefined) {
    payload.compareAtPrice = data.compareAtPrice !== null && data.compareAtPrice !== '' ? Number(data.compareAtPrice) : null;
  }
  if (data.weight !== undefined) {
    payload.weight = data.weight !== null && data.weight !== '' ? Number(data.weight) : null;
  }
  if (data.length !== undefined) {
    payload.length = data.length !== null && data.length !== '' ? Number(data.length) : null;
  }
  if (data.width !== undefined) {
    payload.width = data.width !== null && data.width !== '' ? Number(data.width) : null;
  }
  if (data.height !== undefined) {
    payload.height = data.height !== null && data.height !== '' ? Number(data.height) : null;
  }
  if (data.categoryId !== undefined) payload.categoryId = data.categoryId;
  else if (data.category !== undefined) payload.categoryId = data.category;
  if (data.status !== undefined) payload.status = data.status;
  if (data.stockQuantity !== undefined) payload.stockQuantity = Number(data.stockQuantity);
  else if (data.stock !== undefined) payload.stockQuantity = Number(data.stock);
  if (data.images !== undefined) {
    payload.images = Array.isArray(data.images)
      ? data.images.filter((url) => Boolean(url && url.trim()))
      : data.imageUrl
        ? [data.imageUrl]
        : [];
  } else if (data.imageUrl !== undefined) {
    payload.images = [data.imageUrl];
  }
  if (data.customFields !== undefined) payload.customFields = data.customFields;

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

export async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_URL}/admin/products/upload-image`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to upload image (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function deleteProductImage(url) {
  const res = await fetch(`${BACKEND_URL}/admin/products/delete-image`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to delete image (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}
