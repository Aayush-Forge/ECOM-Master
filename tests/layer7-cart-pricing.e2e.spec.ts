import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 7: Dynamic Pricing & Guest Cart (Live Server E2E)', () => {
  let editorToken: string;
  let categoryId: string;
  let generalProductId: string;
  let underThresholdProductId: string;
  let exactThresholdProductId: string;
  let decimalProductId: string;
  let secondDecimalProductId: string;
  let boundaryProductId: string;
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    editorToken = jwt.sign(
      { sub: 'dbabb7db-ef04-40ba-9273-8916b0fb82a1', email: 'editor@sridattam.com', role: 'editor' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // Get an existing active category
    const catRes = await request(BASE_URL).get('/categories');
    const categories = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
    categoryId = categories[0].id;

    // 1. General Product (Rs. 150)
    const genRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Cart General Product 150',
        slug: `cart-gen-150-${Date.now()}`,
        sku: `CART-GEN-${Date.now()}`,
        basePrice: 150.0,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null, // default template (free at 499, Rs 49 below)
        status: 'active',
      });
    expect([200, 201]).toContain(genRes.status);
    generalProductId = genRes.body.id;
    createdProductIds.push(generalProductId);

    // 2. Under Threshold Product (Rs. 498.00)
    const underRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Cart Under Threshold Product 498',
        slug: `cart-under-498-${Date.now()}`,
        sku: `CART-UNDER-498-${Date.now()}`,
        basePrice: 498.0,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(underRes.status);
    underThresholdProductId = underRes.body.id;
    createdProductIds.push(underThresholdProductId);

    // 3. Exact Threshold Product (Rs. 499.00)
    const exactRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Cart Exact Threshold Product 499',
        slug: `cart-exact-499-${Date.now()}`,
        sku: `CART-EXACT-499-${Date.now()}`,
        basePrice: 499.0,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(exactRes.status);
    exactThresholdProductId = exactRes.body.id;
    createdProductIds.push(exactThresholdProductId);

    // 4. Decimal Product 1 (Rs. 99.95)
    const decRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Cart Decimal Product 99.95',
        slug: `cart-dec-99-95-${Date.now()}`,
        sku: `CART-DEC-99-${Date.now()}`,
        basePrice: 99.95,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(decRes.status);
    decimalProductId = decRes.body.id;
    createdProductIds.push(decimalProductId);

    // 5. Decimal Product 2 (Rs. 149.99)
    const secDecRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Cart Decimal Product 149.99',
        slug: `cart-dec-149-99-${Date.now()}`,
        sku: `CART-DEC-149-${Date.now()}`,
        basePrice: 149.99,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(secDecRes.status);
    secondDecimalProductId = secDecRes.body.id;
    createdProductIds.push(secondDecimalProductId);

    // 6. Boundary Product (Rs. 249.49)
    const bndRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Cart Boundary Product 249.49',
        slug: `cart-bnd-249-49-${Date.now()}`,
        sku: `CART-BND-249-${Date.now()}`,
        basePrice: 249.49,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(bndRes.status);
    boundaryProductId = bndRes.body.id;
    createdProductIds.push(boundaryProductId);
  });

  afterAll(async () => {
    for (const prodId of createdProductIds) {
      await request(BASE_URL)
        .delete(`/admin/delete-products/${prodId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
  });

  // ==========================================
  // CART-01: Guest Cart Quantity Bounds & Item Operations
  // ==========================================
  describe('CART-01: Guest Cart Quantity Bounds & Item Operations', () => {
    let cartId: string;
    let cartToken: string;
    let cartItemId: string;

    it('CART-01.1: POST /cart creates anonymous cart with valid session token', async () => {
      const res = await request(BASE_URL).post('/cart');
      expect([200, 201]).toContain(res.status);
      expect(res.body.id).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBe(64); // 32 bytes hex
      expect(res.body.customerId).toBeNull();
      expect(res.body.status).toBe('active');
      expect(res.body.items).toEqual([]);
      expect(res.body.subtotal).toBe(0);
      expect(res.body.grandTotal).toBe(0);

      cartId = res.body.id;
      cartToken = res.body.token;
    });

    it('CART-01.2: GET /cart/:id without x-cart-token header returns 404 Not Found', async () => {
      const res = await request(BASE_URL).get(`/cart/${cartId}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Cart not found/i);
    });

    it('CART-01.3: GET /cart/:id with invalid x-cart-token header returns 404 Not Found', async () => {
      const res = await request(BASE_URL)
        .get(`/cart/${cartId}`)
        .set('x-cart-token', 'wrong_token_value_deadbeef');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Cart not found/i);
    });

    it('CART-01.4: POST /cart/:id/items with quantity 0 returns 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: generalProductId,
          quantity: 0,
        });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message).toMatch(
        /quantity must not be less than 1|quantity must be greater than/i,
      );
    });

    it('CART-01.5: POST /cart/:id/items with negative quantity -1 returns 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: generalProductId,
          quantity: -1,
        });
      expect(res.status).toBe(400);
    });

    it('CART-01.6: POST /cart/:id/items with excessive quantity 100 returns 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: generalProductId,
          quantity: 100,
        });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message).toMatch(
        /quantity must not be greater than 99/i,
      );
    });

    it('CART-01.7: POST /cart/:id/items with valid quantity 2 adds item and calculates subtotal', async () => {
      const res = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: generalProductId,
          quantity: 2,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].productId).toBe(generalProductId);
      expect(res.body.items[0].quantity).toBe(2);
      expect(res.body.items[0].unitPrice).toBe(150);
      expect(res.body.items[0].lineTotal).toBe(300);
      expect(res.body.subtotal).toBe(300);

      cartItemId = res.body.items[0].id;
    });

    it('CART-01.8: POST /cart/:id/items adding same product merges quantities', async () => {
      const res = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: generalProductId,
          quantity: 3,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(5); // 2 + 3 = 5
      expect(res.body.items[0].lineTotal).toBe(750);
      expect(res.body.subtotal).toBe(750);
    });

    it('CART-01.9: PATCH /cart/:id/items/:itemId with negative quantity -1 returns 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .patch(`/cart/${cartId}/items/${cartItemId}`)
        .set('x-cart-token', cartToken)
        .send({ quantity: -1 });
      expect(res.status).toBe(400);
    });

    it('CART-01.10: PATCH /cart/:id/items/:itemId with quantity 100 returns 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .patch(`/cart/${cartId}/items/${cartItemId}`)
        .set('x-cart-token', cartToken)
        .send({ quantity: 100 });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message).toMatch(
        /quantity must not be greater than 99/i,
      );
    });

    it('CART-01.11: PATCH /cart/:id/items/:itemId with valid quantity 4 updates item and subtotal', async () => {
      const res = await request(BASE_URL)
        .patch(`/cart/${cartId}/items/${cartItemId}`)
        .set('x-cart-token', cartToken)
        .send({ quantity: 4 });
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(4);
      expect(res.body.items[0].lineTotal).toBe(600);
      expect(res.body.subtotal).toBe(600);
    });

    it('CART-01.12: PATCH /cart/:id/items/:itemId with quantity 0 removes item completely from cart', async () => {
      const res = await request(BASE_URL)
        .patch(`/cart/${cartId}/items/${cartItemId}`)
        .set('x-cart-token', cartToken)
        .send({ quantity: 0 });
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.subtotal).toBe(0);
      expect(res.body.grandTotal).toBe(0);

      // Verify item is removed on subsequent GET
      const getRes = await request(BASE_URL)
        .get(`/cart/${cartId}`)
        .set('x-cart-token', cartToken);
      expect(getRes.status).toBe(200);
      expect(getRes.body.items).toEqual([]);
    });

    it('CART-01.13: DELETE /cart/:id/items/:itemId explicitly deletes item', async () => {
      // Add item again first
      const addRes = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: generalProductId,
          quantity: 1,
        });
      expect([200, 201]).toContain(addRes.status);
      expect(addRes.body.items).toHaveLength(1);
      const newItemId = addRes.body.items[0].id;

      // Delete item
      const delRes = await request(BASE_URL)
        .delete(`/cart/${cartId}/items/${newItemId}`)
        .set('x-cart-token', cartToken);
      expect(delRes.status).toBe(200);
      expect(delRes.body.items).toEqual([]);
      expect(delRes.body.subtotal).toBe(0);
    });
  });

  // ==========================================
  // CART-02: Free Shipping Threshold Verification
  // ==========================================
  describe('CART-02: Free Shipping Threshold (Threshold = Rs 499)', () => {
    it('CART-02.1: Cart subtotal Rs 498 (< 499 threshold) incurs standard shipping of Rs 49', async () => {
      const cartRes = await request(BASE_URL).post('/cart');
      const cartId = cartRes.body.id;
      const cartToken = cartRes.body.token;

      const addRes = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: underThresholdProductId, // Rs 498
          quantity: 1,
        });

      expect([200, 201]).toContain(addRes.status);
      expect(addRes.body.subtotal).toBe(498);
      expect(addRes.body.shippingTotal).toBe(49);
      expect(addRes.body.grandTotal).toBe(547); // 498 + 49 = 547
    });

    it('CART-02.2: Cart subtotal Rs 499 (exactly at 499 threshold) receives Free Shipping (Rs 0)', async () => {
      const cartRes = await request(BASE_URL).post('/cart');
      const cartId = cartRes.body.id;
      const cartToken = cartRes.body.token;

      const addRes = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: exactThresholdProductId, // Rs 499
          quantity: 1,
        });

      expect([200, 201]).toContain(addRes.status);
      expect(addRes.body.subtotal).toBe(499);
      expect(addRes.body.shippingTotal).toBe(0);
      expect(addRes.body.grandTotal).toBe(499);
    });

    it('CART-02.3: Cart subtotal Rs 996 (> 499 threshold) receives Free Shipping (Rs 0)', async () => {
      const cartRes = await request(BASE_URL).post('/cart');
      const cartId = cartRes.body.id;
      const cartToken = cartRes.body.token;

      const addRes = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: underThresholdProductId, // Rs 498 * 2 = 996
          quantity: 2,
        });

      expect([200, 201]).toContain(addRes.status);
      expect(addRes.body.subtotal).toBe(996);
      expect(addRes.body.shippingTotal).toBe(0);
      expect(addRes.body.grandTotal).toBe(996);
    });

    it('CART-02.4: Crossing threshold dynamically: qty 1 incurs Rs 49, qty 4 transitions to Free Shipping', async () => {
      const cartRes = await request(BASE_URL).post('/cart');
      const cartId = cartRes.body.id;
      const cartToken = cartRes.body.token;

      // Add 1 unit of Rs 150 -> subtotal 150 < 499 -> shipping 49
      const addRes = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: generalProductId,
          quantity: 1,
        });
      expect([200, 201]).toContain(addRes.status);
      expect(addRes.body.subtotal).toBe(150);
      expect(addRes.body.shippingTotal).toBe(49);
      expect(addRes.body.grandTotal).toBe(199);
      const itemId = addRes.body.items[0].id;

      // Update quantity to 4 -> subtotal 600 >= 499 -> shipping 0
      const updateRes = await request(BASE_URL)
        .patch(`/cart/${cartId}/items/${itemId}`)
        .set('x-cart-token', cartToken)
        .send({ quantity: 4 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.subtotal).toBe(600);
      expect(updateRes.body.shippingTotal).toBe(0);
      expect(updateRes.body.grandTotal).toBe(600);

      // Decrement back to 2 -> subtotal 300 < 499 -> shipping returns to 49
      const decRes = await request(BASE_URL)
        .patch(`/cart/${cartId}/items/${itemId}`)
        .set('x-cart-token', cartToken)
        .send({ quantity: 2 });
      expect(decRes.status).toBe(200);
      expect(decRes.body.subtotal).toBe(300);
      expect(decRes.body.shippingTotal).toBe(49);
      expect(decRes.body.grandTotal).toBe(349);
    });
  });

  // ==========================================
  // CART-03: Paise Precision & Floating-Point Safety
  // ==========================================
  describe('CART-03: Paise Precision & Floating-Point Safety', () => {
    it('CART-03.1: Item with decimal price Rs 99.95 * 3 computes exact subtotal Rs 299.85 and 34885 paise grandTotal', async () => {
      const cartRes = await request(BASE_URL).post('/cart');
      const cartId = cartRes.body.id;
      const cartToken = cartRes.body.token;

      const addRes = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: decimalProductId, // Rs 99.95
          quantity: 3,
        });

      expect([200, 201]).toContain(addRes.status);
      const item = addRes.body.items[0];
      expect(item.unitPrice).toBe(99.95);
      expect(Number(item.lineTotal.toFixed(2))).toBe(299.85);
      expect(Number(addRes.body.subtotal.toFixed(2))).toBe(299.85);
      expect(addRes.body.shippingTotal).toBe(49);
      expect(Number(addRes.body.grandTotal.toFixed(2))).toBe(348.85);

      // Verify paise calculation integrity (Math.round(grandTotal * 100))
      const amountInPaise = Math.round(Number(addRes.body.grandTotal) * 100);
      expect(amountInPaise).toBe(34885);
    });

    it('CART-03.2: Multi-item decimal combination computes clean grandTotal and exact paise', async () => {
      const cartRes = await request(BASE_URL).post('/cart');
      const cartId = cartRes.body.id;
      const cartToken = cartRes.body.token;

      // Add Item 1: 149.99 * 2 = 299.98
      await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: secondDecimalProductId,
          quantity: 2,
        });

      // Add Item 2: 99.95 * 2 = 199.90
      const addRes2 = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: decimalProductId,
          quantity: 2,
        });

      expect([200, 201]).toContain(addRes2.status);
      expect(addRes2.body.items).toHaveLength(2);

      // Expected Subtotal: 299.98 + 199.90 = 499.88
      // Since 499.88 >= 499.00 -> Free Shipping (0)
      // Expected GrandTotal: 499.88
      expect(Number(addRes2.body.subtotal.toFixed(2))).toBe(499.88);
      expect(addRes2.body.shippingTotal).toBe(0);
      expect(Number(addRes2.body.grandTotal.toFixed(2))).toBe(499.88);

      const amountInPaise = Math.round(Number(addRes2.body.grandTotal) * 100);
      expect(amountInPaise).toBe(49988);
    });

    it('CART-03.3: Boundary decimal Rs 249.49 * 2 = Rs 498.98 (below 499 by 2 paise) incurs Rs 49 shipping', async () => {
      const cartRes = await request(BASE_URL).post('/cart');
      const cartId = cartRes.body.id;
      const cartToken = cartRes.body.token;

      const addRes = await request(BASE_URL)
        .post(`/cart/${cartId}/items`)
        .set('x-cart-token', cartToken)
        .send({
          productId: boundaryProductId, // Rs 249.49 * 2 = 498.98
          quantity: 2,
        });

      expect([200, 201]).toContain(addRes.status);
      expect(Number(addRes.body.subtotal.toFixed(2))).toBe(498.98);
      // 498.98 < 499 -> must NOT get free shipping
      expect(addRes.body.shippingTotal).toBe(49);
      expect(Number(addRes.body.grandTotal.toFixed(2))).toBe(547.98);

      const amountInPaise = Math.round(Number(addRes.body.grandTotal) * 100);
      expect(amountInPaise).toBe(54798);
    });
  });
});
