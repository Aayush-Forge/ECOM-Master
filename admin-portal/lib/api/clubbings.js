/**
 * Clubbings & Festive Campaign API Client for Admin Portal
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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

function getAuthHeaders(extra = {}) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const FESTIVE_BANNER_PRESETS = [
  {
    id: 'diwali_gold',
    name: 'Diwali Dhamaka (Royal Agarbatti)',
    tagline: 'Diwali Sale',
    url: '/HD1.png',
    accentColor: '#D7A65B',
    bgColor: '#4D0013',
  },
  {
    id: 'sacred_puja',
    name: 'Sacred Puja Rituals (Hand-Rolled Incense)',
    tagline: 'Festive Clubbing',
    url: '/HD2.png',
    accentColor: '#FF6B00',
    bgColor: '#2E050E',
  },
  {
    id: 'sambrani_festive',
    name: 'Divine Incense & Sambrani (Midnight Glow)',
    tagline: 'Special Clubbing',
    url: '/HD4.png',
    accentColor: '#E6B800',
    bgColor: '#1A0208',
  },
];

export async function uploadClubbingBanner(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_URL}/clubbing/upload-banner`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || `Failed to upload banner image (${res.status})`;
    throw new Error(message);
  }

  return await res.json(); // { url: string, key: string }
}

export async function getAllClubbings() {
  try {
    const res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to fetch clubbings from backend:', err);
    return [];
  }
}

export async function getActiveClubbings() {
  try {
    const res = await fetch(`${BACKEND_URL}/clubbing/active`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Failed to fetch active clubbings from backend:', err);
    return [];
  }
}

export async function getClubbingById(id) {
  try {
    const res = await fetch(`${BACKEND_URL}/clubbing-rules/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to fetch clubbing ${id}:`, err);
    return null;
  }
}

export async function createClubbing(data) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create campaign (${res.status})`);
  }
  return await res.json();
}

export async function updateClubbing(id, data) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to update campaign (${res.status})`);
  }
  return await res.json();
}

export async function toggleClubbingStatus(id) {
  const res = await fetch(`${BACKEND_URL}/clubbing/${encodeURIComponent(id)}/toggle`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    // Fallback: try PATCH with flipped status
    const current = await getClubbingById(id);
    if (!current) throw new Error('Clubbing campaign not found');
    return await updateClubbing(id, { isActive: !current.isActive });
  }
  return await res.json();
}

export async function deleteClubbing(id) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to delete campaign (${res.status})`);
  }
  return await res.json();
}
