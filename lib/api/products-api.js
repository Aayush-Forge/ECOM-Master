/**
 * Products API client (admin CRUD) — mock implementation.
 *
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend product endpoints are ready.
 */

let MOCK_PRODUCTS = [
  {
    id: 'prod_001',
    title: 'Premium Sandalwood Agarbatti',
    sku: 'SD-001',
    price: 599,
    category: 'sandalwood',
    stock: 45,
    description: 'Hand-rolled pure Mysore sandalwood incense sticks. Each stick burns for 45 minutes with a rich, woody fragrance ideal for meditation and pooja.',
    imageUrl: 'https://images.unsplash.com/photo-1589301773859-b1b4e3b4b1b4?w=300',
    status: 'active',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'prod_002',
    title: 'Rose Petal Dhoop Sticks',
    sku: 'SD-002',
    price: 349,
    category: 'floral',
    stock: 0,
    description: 'Made from dried rose petals and natural resins. Produces a sweet, calming smoke perfect for evening aarti.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300',
    status: 'active',
    createdAt: '2025-02-10T10:00:00Z',
  },
  {
    id: 'prod_003',
    title: 'Guggul Resin Blend',
    sku: 'SD-003',
    price: 799,
    category: 'resins',
    stock: 4,
    description: 'Premium Commiphora wightii resin blend. Used traditionally in havans and Ayurvedic smoke therapy for purification.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    status: 'active',
    createdAt: '2025-03-05T10:00:00Z',
  },
  {
    id: 'prod_004',
    title: 'Sacred Camphor Tablets',
    sku: 'SD-004',
    price: 199,
    category: 'camphor',
    stock: 120,
    description: 'Pure synthetic-free camphor tablets for aarti and daily pooja. Burns clean with no residue.',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300',
    status: 'active',
    createdAt: '2025-03-20T10:00:00Z',
  },
  {
    id: 'prod_005',
    title: 'Jasmine Masala Incense',
    sku: 'SD-005',
    price: 449,
    category: 'floral',
    stock: 0,
    description: 'Handcrafted masala incense infused with jasmine absolute and natural herbs. Long-lasting fragrance for temple rooms.',
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=300',
    status: 'active',
    createdAt: '2025-04-12T10:00:00Z',
  },
  {
    id: 'prod_006',
    title: 'Temple Essentials Combo',
    sku: 'SD-006',
    price: 1499,
    category: 'combos',
    stock: 15,
    description: 'Complete pooja kit: Sandalwood agarbatti, camphor tablets, guggul resin, and cotton wicks. Everything needed for daily worship.',
    imageUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=300',
    status: 'active',
    createdAt: '2025-05-01T10:00:00Z',
  },
];

const CATEGORIES = ['sandalwood', 'floral', 'resins', 'camphor', 'samidha', 'combos'];

export function getAdminProductsSync() {
  return [...MOCK_PRODUCTS];
}

export function getAdminProductByIdSync(id) {
  return MOCK_PRODUCTS.find((p) => p.id === id) || null;
}

export async function getAdminProducts() {
  return getAdminProductsSync();
}

export async function getAdminProductById(id) {
  return getAdminProductByIdSync(id);
}

export async function getProductCategories() {
  return [...CATEGORIES];
}

export async function createProduct(data) {
  const newProd = {
    id: `prod_${String(MOCK_PRODUCTS.length + 1).padStart(3, '0')}`,
    ...data,
    stock: data.stock !== undefined ? Number(data.stock) : 20,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  MOCK_PRODUCTS.push(newProd);
  return newProd;
}

export async function updateProduct(id, data) {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Product not found');
  MOCK_PRODUCTS[idx] = { ...MOCK_PRODUCTS[idx], ...data };
  return MOCK_PRODUCTS[idx];
}

export async function deleteProduct(id) {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Product not found');
  MOCK_PRODUCTS.splice(idx, 1);
  return { success: true };
}
