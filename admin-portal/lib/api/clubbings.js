/**
 * Clubbings & Festive Campaign API Client for Admin Portal
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const FESTIVE_BANNER_PRESETS = [
  {
    id: 'diwali_gold',
    name: 'Diwali Dhamaka (Gold & Maroon)',
    tagline: 'Diwali Sale',
    url: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
    accentColor: '#D7A65B',
    bgColor: '#4D0013',
  },
  {
    id: 'sacred_puja',
    name: 'Sacred Puja Rituals (Saffron Flame)',
    tagline: 'Festive Clubbing',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80',
    accentColor: '#FF6B00',
    bgColor: '#2E050E',
  },
  {
    id: 'sambrani_festive',
    name: 'Divine Incense & Sambrani (Midnight Glow)',
    tagline: 'Special Clubbing',
    url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=1600&q=80',
    accentColor: '#E6B800',
    bgColor: '#1A0208',
  },
];

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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to delete campaign (${res.status})`);
  }
  return await res.json();
}
