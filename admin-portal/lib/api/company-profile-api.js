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

export async function fetchCompanyProfile() {
  const res = await fetch(`${BACKEND_URL}/admin/company-profile`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to fetch company profile (${res.status})`);
  }

  return res.json();
}

export async function updateCompanyProfile(payload) {
  const res = await fetch(`${BACKEND_URL}/admin/company-profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message || `Failed to update company profile (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function fetchCompanyDocuments() {
  const res = await fetch(`${BACKEND_URL}/admin/company-profile/documents`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to fetch company documents (${res.status})`);
  }

  return res.json();
}

export async function uploadCompanyDocument(title, file) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('file', file);

  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_URL}/admin/company-profile/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message || `Failed to upload company document (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function deleteCompanyDocument(documentId) {
  const res = await fetch(`${BACKEND_URL}/admin/company-profile/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to delete company document (${res.status})`);
  }

  return res.json();
}

