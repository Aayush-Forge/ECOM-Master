/**
 * Reviews API client for Admin Portal.
 * Connects to NestJS ReviewsController via NEXT_PUBLIC_BACKEND_URL.
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

export async function getProductReviewSummaries(search = '') {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${BACKEND_URL}/reviews/products-summary${qs}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch product review summaries (${res.status})`);
  }

  return res.json();
}

export async function getReviews(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.stars) query.set('stars', String(params.stars));
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.productId) query.set('productId', params.productId);

  const qs = query.toString();
  const url = `${BACKEND_URL}/reviews${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch reviews (${res.status})`);
  }

  return res.json();
}

export async function deleteReview(id) {
  const res = await fetch(`${BACKEND_URL}/reviews/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.message || `Failed to delete review (${res.status})`);
  }

  return res.json();
}
