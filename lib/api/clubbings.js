/**
 * Clubbings API & Campaign Storage Client
 *
 * Provides full CRUD operations, banner image management, active rule evaluation,
 * and cart discount calculation for festival campaigns and product bundles.
 */

import { requireRole } from '../roles.js';
import { currentUser, getCurrentUser } from '../mock-user.js';

function getEffectiveUser(user) {
  if (user && user.role) return user;
  const loggedIn = getCurrentUser();
  if (loggedIn && loggedIn.role) return loggedIn;
  return { role: 'admin' };
}

// Curated festive banner presets for instant admin preview/use
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

const DEFAULT_CLUBBINGS = [
  {
    id: 'diwali',
    name: 'Diwali',
    eventName: 'Diwali',
    tagline: 'Diwali Sale',
    description: 'Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.',
    type: 'custom_product_clubbing',
    requiredQuantity: 1,
    fixedPrice: null,
    percentageOff: null,
    applicableCategory: 'all',
    applicableProductIds: ['sd-001', 'sd-002', 'sd-003', 'sd-004', 'sd-005', 'sd-006'],
    clubbingProducts: [
      {
        productId: 'sd-001',
        name: 'Royal Mysore Sandalwood',
        slug: 'royal-mysore-sandalwood',
        image: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80',
        category: 'Mysore Sandalwood',
        originalPrice: 399,
        clubbingPrice: 299,
        discountPercentage: 25,
      },
      {
        productId: 'sd-002',
        name: 'Divine Rose',
        slug: 'divine-rose-incense',
        image: 'https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80',
        category: 'Floral Notes',
        originalPrice: 349,
        clubbingPrice: 249,
        discountPercentage: 29,
      },
      {
        productId: 'sd-003',
        name: 'Sacred Frankincense',
        slug: 'sacred-frankincense-incense',
        image: 'https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80',
        category: 'Sacred Resins',
        originalPrice: 449,
        clubbingPrice: 329,
        discountPercentage: 27,
      },
      {
        productId: 'sd-004',
        name: 'The Maharaja Luxury Sticks',
        slug: 'maharaja-luxury-sticks',
        image: 'https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80',
        category: 'Mysore Sandalwood',
        originalPrice: 549,
        clubbingPrice: 399,
        discountPercentage: 27,
      },
      {
        productId: 'sd-005',
        name: 'The Monk Meditation Cones',
        slug: 'monk-meditation-cones',
        image: 'https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80',
        category: 'Mysore Sandalwood',
        originalPrice: 499,
        clubbingPrice: 389,
        discountPercentage: 22,
      },
      {
        productId: 'sd-006',
        name: 'Vedic Havan Sambrani Cups',
        slug: 'vedic-havan-sambrani-cups',
        image: 'https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80',
        category: 'Sacred Resins',
        originalPrice: 399,
        clubbingPrice: 299,
        discountPercentage: 25,
      },
    ],
    bannerImageDesktop: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
    bannerImageMobile: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80',
    startsAt: '2026-10-01T00:00:00Z',
    endsAt: '2026-11-30T23:59:59Z',
    isActive: true,
    featuredOnHomepage: true,
    createdAt: '2026-10-01T00:00:00Z',
  },
];

const STORAGE_KEY = 'sd_clubbing_campaigns_v6';

function loadStoredClubbings() {
  if (typeof window === 'undefined') return [...DEFAULT_CLUBBINGS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLUBBINGS));
      return [...DEFAULT_CLUBBINGS];
    }
    const parsed = JSON.parse(raw);
    const valid = Array.isArray(parsed) ? parsed.filter(c => c && c.isActive && Array.isArray(c.clubbingProducts) && c.clubbingProducts.length > 0) : [];
    return valid.length > 0 ? valid : [...DEFAULT_CLUBBINGS];
  } catch (err) {
    console.warn('Failed to parse stored clubbings, falling back to defaults:', err);
    return [...DEFAULT_CLUBBINGS];
  }
}

function persistClubbings(list) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Dispatch custom event so any active page/tab updates instantaneously
    window.dispatchEvent(new CustomEvent('sd:clubbings-updated', { detail: list }));
  } catch (err) {
    console.error('Failed to save clubbings to localStorage:', err);
  }
}

// ---------------------------------------------------------------------------
// Public API Methods
// ---------------------------------------------------------------------------

export function getAllClubbingsSync() {
  return loadStoredClubbings();
}

export async function getAllClubbings() {
  const local = getAllClubbingsSync();
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('http://localhost:5000/clubbing-rules', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const backendRules = await res.json();
        if (Array.isArray(backendRules) && backendRules.length > 0) {
          const localMap = new Map(local.map((r) => [r.id, r]));
          for (const br of backendRules) {
            // Only merge backend rules if they actually feature products
            if (!Array.isArray(br.clubbingProducts) || br.clubbingProducts.length === 0) continue;

            const mapped = {
              id: br.id,
              name: br.name,
              eventName: br.eventName || br.name,
              tagline: br.tagline || 'Festive Sale',
              description: br.description || `Special clubbing offer for ${br.name}`,
              type: br.type || 'custom_product_clubbing',
              requiredQuantity: 1,
              fixedPrice: br.fixedPrice !== null && br.fixedPrice !== undefined ? Number(br.fixedPrice) : null,
              percentageOff: br.percentageOff !== null && br.percentageOff !== undefined ? Number(br.percentageOff) : null,
              applicableCategory: br.applicableCategoryId || null,
              applicableProductIds: br.applicableProductIds || [],
              clubbingProducts: br.clubbingProducts || [],
              bannerImageDesktop: br.bannerImageDesktop || br.bannerImage || FESTIVE_BANNER_PRESETS[0].url,
              bannerImageMobile: br.bannerImageMobile || br.bannerImageDesktop || br.bannerImage || FESTIVE_BANNER_PRESETS[0].url,
              bannerImage: br.bannerImageDesktop || br.bannerImage || FESTIVE_BANNER_PRESETS[0].url,
              startsAt: br.startsAt || new Date().toISOString(),
              endsAt: br.endsAt || null,
              isActive: br.isActive !== false,
              featuredOnHomepage: br.featuredOnHomepage !== false,
              createdAt: br.createdAt || new Date().toISOString(),
            };
            localMap.set(br.id, mapped);
          }
          const merged = Array.from(localMap.values());
          persistClubbings(merged);
          return merged;
        }
      }
    } catch {
      // Fallback silently to local
    }
  }
  return local;
}

export async function getActiveClubbings() {
  const all = await getAllClubbings();
  const now = new Date();
  return all.filter((c) => {
    if (!c.isActive) return false;
    if (c.startsAt && new Date(c.startsAt) > now) return false;
    if (c.endsAt && new Date(c.endsAt) < now) return false;
    return true;
  });
}

export async function getClubbingById(id) {
  const all = await getAllClubbings();
  return all.find((c) => c.id === id) || null;
}

export async function createClubbing(data, user = currentUser) {
  requireRole('editor', getEffectiveUser(user));
  const current = loadStoredClubbings();
  const desktopImg = data.bannerImageDesktop || data.bannerImage || FESTIVE_BANNER_PRESETS[0].url;
  const mobileImg = data.bannerImageMobile || desktopImg;

  const clubbingProducts = Array.isArray(data.clubbingProducts) ? data.clubbingProducts : [];
  const applicableProductIds = Array.isArray(data.applicableProductIds) && data.applicableProductIds.length > 0
    ? data.applicableProductIds
    : clubbingProducts.map((p) => p.productId || p.id).filter(Boolean);

  const newClubbing = {
    id: `clb_${Date.now()}`,
    name: String(data.name || '').trim(),
    tagline: String(data.tagline || 'Festive Clubbing').trim(),
    description: String(data.description || '').trim(),
    type: 'custom_product_clubbing',
    requiredQuantity: 1,
    fixedPrice: null,
    percentageOff: null,
    applicableCategory: data.applicableCategory || null,
    applicableProductIds,
    clubbingProducts,
    bannerImageDesktop: desktopImg,
    bannerImageMobile: mobileImg,
    bannerImage: desktopImg,
    startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : new Date().toISOString(),
    endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
    isActive: data.isActive !== false,
    featuredOnHomepage: data.featuredOnHomepage !== false,
    createdAt: new Date().toISOString(),
  };

  const updated = [newClubbing, ...current];
  persistClubbings(updated);

  // Sync to NestJS backend if running
  if (typeof window !== 'undefined') {
    fetch('http://localhost:5000/clubbing-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newClubbing.name,
        type: newClubbing.type,
        applicableProductIds: newClubbing.applicableProductIds,
        isActive: newClubbing.isActive,
      }),
    }).catch(() => {});
  }

  return newClubbing;
}

export async function updateClubbing(id, data, user = currentUser) {
  requireRole('editor', getEffectiveUser(user));
  const current = loadStoredClubbings();
  const idx = current.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Clubbing campaign not found');

  const existing = current[idx];
  const desktopImg = data.bannerImageDesktop !== undefined ? data.bannerImageDesktop : (existing.bannerImageDesktop || existing.bannerImage);
  const mobileImg = data.bannerImageMobile !== undefined ? data.bannerImageMobile : (existing.bannerImageMobile || desktopImg);

  const clubbingProducts = Array.isArray(data.clubbingProducts) ? data.clubbingProducts : existing.clubbingProducts || [];
  const applicableProductIds = Array.isArray(data.applicableProductIds) && data.applicableProductIds.length > 0
    ? data.applicableProductIds
    : clubbingProducts.map((p) => p.productId || p.id).filter(Boolean);

  const updatedItem = {
    ...existing,
    ...data,
    bannerImageDesktop: desktopImg,
    bannerImageMobile: mobileImg,
    bannerImage: desktopImg,
    clubbingProducts,
    applicableProductIds,
    updatedAt: new Date().toISOString(),
  };

  current[idx] = updatedItem;
  persistClubbings(current);
  return updatedItem;
}

export async function toggleClubbingStatus(id, user = currentUser) {
  requireRole('editor', getEffectiveUser(user));
  const current = loadStoredClubbings();
  const item = current.find((c) => c.id === id);
  if (!item) throw new Error('Clubbing campaign not found');
  item.isActive = !item.isActive;
  persistClubbings(current);
  return item;
}

export async function deleteClubbing(id, user = currentUser) {
  requireRole('editor', getEffectiveUser(user));
  const current = loadStoredClubbings();
  const filtered = current.filter((c) => c.id !== id);
  persistClubbings(filtered);
  return { success: true };
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

      const cartMatch = cartItems.find((it) => it.product_id === pId);
      if (cartMatch) {
        // If the item in cart was added at regular price, give discount = (originalPrice - clubbingPrice) * qty
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

