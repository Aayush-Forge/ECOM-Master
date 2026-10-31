/**
 * Clubbings & Festive Campaign API Client (Storefront)
 *
 * Provides real backend-backed queries for festive campaigns, banner imagery,
 * active rule evaluation, and cart discount calculations.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Curated festive banner presets for instant preview/use
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

export const DEFAULT_CLUBBINGS = [
  {
    id: 'diwali',
    name: 'Diwali',
    eventName: 'Diwali',
    tagline: 'Diwali Sale',
    description:
      'Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.',
    type: 'custom_product_clubbing',
    requiredQuantity: 1,
    fixedPrice: null,
    percentageOff: null,
    applicableCategory: 'all',
    applicableProductIds: [],
    clubbingProducts: [],
    bannerImageDesktop:
      'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
    bannerImageMobile:
      'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80',
    bannerImage:
      'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
    isActive: true,
    featuredOnHomepage: true,
    showInHero: true,
    heroCtaText: 'Shop Festive Deals',
  },
];

function normalizeClubbingRule(br) {
  if (!br) return null;
  const clubbingProducts = Array.isArray(br.clubbingProducts)
    ? br.clubbingProducts
    : Array.isArray(br.products)
      ? br.products.map((p) => ({
          productId: p.productId || p.product?.id || p.id,
          name: p.product?.title || p.name || 'Sacred Item',
          slug: p.product?.slug || p.slug || '',
          image:
            Array.isArray(p.product?.images) && p.product.images[0]
              ? p.product.images[0]
              : p.image || FESTIVE_BANNER_PRESETS[0].url,
          category: p.product?.category?.name || p.category || 'Sacred Incense',
          originalPrice: Number(p.product?.basePrice || p.originalPrice || 399),
          clubbingPrice: Number(p.clubbingPrice || p.price || 299),
          discountPercentage: Number(p.discountPercentage || 25),
        }))
      : [];

  return {
    id: br.id,
    name: br.name,
    eventName: br.eventName || br.name,
    tagline: br.tagline || 'Festive Sale',
    description: br.description || `Special clubbing offer for ${br.name}`,
    type: br.type || 'custom_product_clubbing',
    requiredQuantity: br.requiredQuantity ? Number(br.requiredQuantity) : 1,
    fixedPrice: br.fixedPrice !== null && br.fixedPrice !== undefined ? Number(br.fixedPrice) : null,
    percentageOff:
      br.percentageOff !== null && br.percentageOff !== undefined ? Number(br.percentageOff) : null,
    applicableCategory: br.applicableCategory || br.applicableCategoryId || 'all',
    applicableProductIds: br.applicableProductIds || [],
    clubbingProducts,
    bannerImageDesktop: br.bannerImageDesktop || br.bannerImage || FESTIVE_BANNER_PRESETS[0].url,
    bannerImageMobile:
      br.bannerImageMobile || br.bannerImageDesktop || br.bannerImage || FESTIVE_BANNER_PRESETS[0].url,
    bannerImage: br.bannerImageDesktop || br.bannerImage || FESTIVE_BANNER_PRESETS[0].url,
    startsAt: br.startsAt || new Date().toISOString(),
    endsAt: br.endsAt || null,
    isActive: br.isActive !== false,
    featuredOnHomepage: br.featuredOnHomepage !== false,
    showInHero: br.showInHero !== false,
    heroCtaText: br.heroCtaText || 'Shop Festive Deals',
    createdAt: br.createdAt || new Date().toISOString(),
  };
}

export async function getAllClubbings() {
  try {
    const res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(normalizeClubbingRule).filter(Boolean) : [];
  } catch (err) {
    console.warn('Failed to fetch clubbings from backend:', err);
    return DEFAULT_CLUBBINGS;
  }
}

export async function getActiveClubbings() {
  try {
    const res = await fetch(`${BACKEND_URL}/clubbing-rules/active`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizeClubbingRule).filter(Boolean);
    }
  } catch (err) {
    console.warn('Failed to fetch active clubbings from backend:', err);
  }
  return DEFAULT_CLUBBINGS;
}

export function getAllClubbingsSync() {
  return DEFAULT_CLUBBINGS;
}

export async function createClubbing(data) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create clubbing: ${res.status}`);
  return await res.json();
}

export async function updateClubbing(id, data) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update clubbing: ${res.status}`);
  return await res.json();
}

export async function toggleClubbingStatus(id) {
  const res = await fetch(`${BACKEND_URL}/clubbing/${encodeURIComponent(id)}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to toggle clubbing: ${res.status}`);
  return await res.json();
}

export async function deleteClubbing(id) {
  const res = await fetch(`${BACKEND_URL}/clubbing-rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete clubbing: ${res.status}`);
  return await res.json();
}

export async function getClubbingById(id) {
  try {
    const res = await fetch(`${BACKEND_URL}/clubbing-rules/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return normalizeClubbingRule(data);
  } catch (err) {
    console.warn(`Failed to fetch clubbing ${id}:`, err);
    return null;
  }
}

/**
 * Calculates clubbing promotional discount on cart items based on active clubbing product prices.
 * @param {Array} cartItems - items with { product_id, quantity, price }
 * @param {Array} activeClubbings - array of active clubbing rules
 * @returns {{ discount: number, appliedRule: object|null }}
 */
export function calculateClubbingDiscount(cartItems = [], activeClubbings = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { discount: 0, appliedRule: null };
  }

  let totalDiscount = 0;
  let appliedRule = null;

  for (const rule of activeClubbings) {
    if (!rule.isActive || !Array.isArray(rule.clubbingProducts)) continue;

    for (const cp of rule.clubbingProducts) {
      const pId = cp.productId || cp.id;
      const clubbingPrice = parseFloat(cp.clubbingPrice);
      const originalPrice = parseFloat(cp.originalPrice);

      if (!pId || isNaN(clubbingPrice) || isNaN(originalPrice) || clubbingPrice >= originalPrice) continue;

      const cartMatch = cartItems.find((it) => (it.productId || it.product_id) === pId);
      if (cartMatch) {
        const curPrice = parseFloat(cartMatch.price) || originalPrice;
        if (curPrice > clubbingPrice) {
          const saving = (curPrice - clubbingPrice) * (cartMatch.quantity || 1);
          totalDiscount += saving;
          appliedRule = rule;
        }
      }
    }
  }

  return {
    discount: Math.round(totalDiscount),
    appliedRule,
  };
}

/**
 * Extracts a punchy, clean uppercase festival label for the navigation bar
 * (e.g., 'DIWALI', 'NAVRATRI', 'HOLI', or falls back to 'FESTIVE')
 * @param {object|null} rule - active clubbing rule
 * @returns {string} uppercase festival title
 */
export function extractFestivalNavLabel(rule) {
  if (!rule || !rule.name) return 'FESTIVE';
  const name = String(rule.name).trim();
  const lower = name.toLowerCase();

  if (lower.includes('diwali')) return 'DIWALI';
  if (lower.includes('navratri')) return 'NAVRATRI';
  if (lower.includes('holi')) return 'HOLI';
  if (lower.includes('durga')) return 'DURGA PUJA';
  if (lower.includes('ganesh')) return 'GANESH PUJA';
  if (lower.includes('dhamaka')) return 'DIWALI';
  if (lower.includes('festive') || lower.includes('festival')) return 'FESTIVE';

  if (rule.tagline && rule.tagline.trim().length <= 15) {
    return rule.tagline.trim().toUpperCase();
  }

  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].length + words[1].length < 14) {
    return `${words[0]} ${words[1]}`.toUpperCase();
  }
  return (words[0] || 'FESTIVE').toUpperCase();
}
