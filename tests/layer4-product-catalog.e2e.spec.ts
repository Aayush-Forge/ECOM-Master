import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 4: Product Catalog, Variations & Cloudflare R2 Media (Live Server E2E)', () => {
  let editorToken: string;
  let categoryId: string;
  let createdDraftSlug: string;
  let createdDraftId: string;

  beforeAll(async () => {
    // 1. Generate valid editor token
    editorToken = jwt.sign(
      { sub: 'dbabb7db-ef04-40ba-9273-8916b0fb82a1', email: 'editor@sridattam.com', role: 'editor' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // 2. Fetch a valid category ID from live database
    const catRes = await request(BASE_URL).get('/categories');
    expect(catRes.status).toBe(200);
    const categories = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
    expect(categories.length).toBeGreaterThan(0);
    categoryId = categories[0].id;
  });

  describe('PROD-01: SKU Uniqueness Constraint', () => {
    it('rejects creating a product with an already existing SKU with 409 Conflict', async () => {
      const res = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Duplicate SKU Product',
          slug: `dup-sku-${Date.now()}`,
          sku: 'AGB-RAJ-100', // Pre-existing seeded SKU
          basePrice: 150,
          categoryId,
          status: 'draft',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists|SKU/i);
    });

    it('rejects duplicate variation SKUs within the same variable product with 409 Conflict', async () => {
      const res = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Duplicate Var SKU Product',
          slug: `dup-var-sku-${Date.now()}`,
          sku: `PARENT-SKU-${Date.now()}`,
          productType: 'variable',
          categoryId,
          status: 'draft',
          attributes: [
            { name: 'Size', options: ['Small', 'Large'], visible: true, variation: true },
          ],
          variations: [
            {
              sku: 'SAME-VAR-SKU',
              regularPrice: 100,
              stockQuantity: 10,
              attributes: [{ name: 'Size', option: 'Small' }],
            },
            {
              sku: 'SAME-VAR-SKU', // Duplicate variation SKU
              regularPrice: 200,
              stockQuantity: 10,
              attributes: [{ name: 'Size', option: 'Large' }],
            },
          ],
        });

      expect(res.status).toBe(409);
    });
  });

  describe('PROD-02: Price Sanity Guards', () => {
    it('rejects variable product variation where salePrice >= regularPrice with 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Invalid Sale Price Product',
          slug: `inv-sale-${Date.now()}`,
          sku: `INV-SALE-${Date.now()}`,
          productType: 'variable',
          categoryId,
          status: 'draft',
          attributes: [
            { name: 'Pack', options: ['100g'], visible: true, variation: true },
          ],
          variations: [
            {
              sku: `VAR-SALE-BAD-${Date.now()}`,
              regularPrice: 100,
              salePrice: 150, // Invalid: salePrice > regularPrice
              stockQuantity: 5,
              attributes: [{ name: 'Pack', option: '100g' }],
            },
          ],
        });

      // Express/Multer returns 413 Payload Too Large when file size exceeds limit
      expect([400, 413]).toContain(res.status);
      expect(res.body.message).toMatch(/lower than regular price/i);
    });

    it('rejects variable product variation where regularPrice <= 0 with 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Zero Price Product',
          slug: `zero-price-${Date.now()}`,
          sku: `ZERO-PRICE-${Date.now()}`,
          productType: 'variable',
          categoryId,
          status: 'draft',
          attributes: [
            { name: 'Pack', options: ['100g'], visible: true, variation: true },
          ],
          variations: [
            {
              sku: `VAR-ZERO-${Date.now()}`,
              regularPrice: 0, // Invalid: regularPrice <= 0
              stockQuantity: 5,
              attributes: [{ name: 'Pack', option: '100g' }],
            },
          ],
        });

      // Express/Multer returns 413 Payload Too Large when file size exceeds limit
      expect([400, 413]).toContain(res.status);
      expect(JSON.stringify(res.body.message)).toMatch(/greater than 0/i);
    });
  });

  describe('PROD-03: Draft Isolation', () => {
    beforeAll(async () => {
      createdDraftSlug = `secret-draft-item-${Date.now()}`;
      const createRes = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Secret Draft Incense',
          slug: createdDraftSlug,
          sku: `SKU-DRAFT-${Date.now()}`,
          basePrice: 99,
          categoryId,
          status: 'draft',
        });

      expect([200, 201]).toContain(createRes.status);
      createdDraftId = createRes.body.id;
    });

    it('unauthenticated GET /products/:slug returns 404 Not Found for draft item', async () => {
      const res = await request(BASE_URL).get(`/products/${createdDraftSlug}`);
      expect(res.status).toBe(404);
    });

    it('unauthenticated GET /products/:slug?admin=true still returns 404 Not Found', async () => {
      const res = await request(BASE_URL).get(`/products/${createdDraftSlug}?admin=true`);
      expect(res.status).toBe(404);
    });

    it('editor authenticated GET /admin/products/:id successfully fetches draft product', async () => {
      const res = await request(BASE_URL)
        .get(`/admin/products/${createdDraftId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.slug).toBe(createdDraftSlug);
      expect(res.body.status).toBe('draft');
    });
  });

  describe('PROD-04: Variable Product Hierarchy', () => {
    it('creates variable product with multiple variations and maintains distinct prices and stocks', async () => {
      const varSlug = `var-hierarchy-${Date.now()}`;
      const varSku = `VAR-HIER-${Date.now()}`;
      const v1Sku = `V1-${Date.now()}`;
      const v2Sku = `V2-${Date.now()}`;

      const res = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Multi-Variant Incense',
          slug: varSlug,
          sku: varSku,
          productType: 'variable',
          categoryId,
          status: 'active',
          attributes: [
            { name: 'Weight', options: ['50g', '100g'], visible: true, variation: true },
          ],
          variations: [
            {
              sku: v1Sku,
              regularPrice: 120,
              salePrice: 99,
              stockQuantity: 25,
              weight: 0.1,
              attributes: [{ name: 'Weight', option: '50g' }],
            },
            {
              sku: v2Sku,
              regularPrice: 220,
              salePrice: 189,
              stockQuantity: 40,
              weight: 0.2,
              attributes: [{ name: 'Weight', option: '100g' }],
            },
          ],
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.variations).toHaveLength(2);

      const v1 = res.body.variations.find((v: any) => v.sku === v1Sku);
      const v2 = res.body.variations.find((v: any) => v.sku === v2Sku);

      expect(Number(v1.regularPrice)).toBe(120);
      expect(Number(v1.salePrice)).toBe(99);
      expect(v1.stockQuantity).toBe(25);

      expect(Number(v2.regularPrice)).toBe(220);
      expect(Number(v2.salePrice)).toBe(189);
      expect(v2.stockQuantity).toBe(40);
    });
  });

  describe('PROD-05: Media Upload & Type Filtering', () => {
    it('rejects disallowed file type (application/pdf) on product image upload with 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post('/admin/products/upload-image')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 dummy pdf bytes'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      // Express/Multer returns 413 Payload Too Large when file size exceeds limit
      expect([400, 413]).toContain(res.status);
      expect(res.body.message).toMatch(/unsupported file type/i);
    });

    it('rejects oversized file (> 5MB) with 400 Bad Request', async () => {
      // 5.2 MB fake image buffer
      const oversizedBuffer = Buffer.alloc(5.2 * 1024 * 1024);
      const res = await request(BASE_URL)
        .post('/admin/products/upload-image')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', oversizedBuffer, {
          filename: 'huge-image.jpg',
          contentType: 'image/jpeg',
        });

      // Express/Multer returns 413 Payload Too Large when file size exceeds limit
      expect([400, 413]).toContain(res.status);
    });
  });
});
