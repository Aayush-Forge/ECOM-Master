const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const direct = localStorage.getItem('admin_token');
    if (direct) return direct;
    const raw = localStorage.getItem('auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.access_token || parsed.token || null;
    }
    const match = document.cookie.match(/(?:^|;\s*)sd_auth_session=([^;]+)/);
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      return parsed.access_token || parsed.token || null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}