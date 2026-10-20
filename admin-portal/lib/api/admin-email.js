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

export async function getEmailLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.templateKey) query.set('templateKey', params.templateKey);
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));

  const url = `${BACKEND_URL}/admin/email/logs${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch email logs (${res.status})`);
  }

  return res.json();
}

export async function getEmailStats() {
  const res = await fetch(`${BACKEND_URL}/admin/email/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch email stats (${res.status})`);
  }

  return res.json();
}

export async function retryEmailLog(id) {
  const res = await fetch(`${BACKEND_URL}/admin/email/logs/${id}/retry`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to retry email send (${res.status})`);
  }

  return res.json();
}

export async function getEmailTemplates() {
  const res = await fetch(`${BACKEND_URL}/admin/email/templates`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch email templates (${res.status})`);
  }

  return res.json();
}

export async function updateEmailTemplate(key, data) {
  const res = await fetch(`${BACKEND_URL}/admin/email/templates/${key}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to update email template (${res.status})`);
  }

  return res.json();
}

export async function previewEmailTemplate(key, draftWording = {}) {
  const res = await fetch(`${BACKEND_URL}/admin/email/templates/${key}/preview`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(draftWording),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to generate email preview (${res.status})`);
  }

  return res.json();
}
