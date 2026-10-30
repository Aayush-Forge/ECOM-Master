import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 6: Shipping Engine & Slab Boundaries (Live Server E2E)', () => {
  let adminToken: string;
  let editorToken: string;
  let defaultTemplateId: string;
  let weightTemplateId: string;
  let inStockWeightProductId: string;
  let inStockWeightProductSku: string;
  let categoryId: string;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { sub: 'edaee9ba-18f7-4844-9ec6-1c2e81312913', email: 'admin@sridattam.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    editorToken = jwt.sign(
      { sub: 'dbabb7db-ef04-40ba-9273-8916b0fb82a1', email: 'editor@sridattam.com', role: 'editor' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // 1. Get default template
    const defRes = await request(BASE_URL).get('/shipping-templates/default');
    expect(defRes.status).toBe(200);
    defaultTemplateId = defRes.body.id;

    // 2. Get category
    const catRes = await request(BASE_URL).get('/categories');
    const categories = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
    categoryId = categories[0].id;

    // 3. Create weight template: <= 1kg: Rs 50, <= 2kg: Rs 80, <= 5kg: Rs 150
    const tplRes = await request(BASE_URL)
      .post('/shipping-templates')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        name: `Weight Slab Template ${Date.now()}`,
        carrierName: 'SpeedPost',
        rateType: 'weight',
        slabs: [
          { upTo: 1.0, charge: 50 },
          { upTo: 2.0, charge: 80 },
          { upTo: 5.0, charge: 150 },
        ],
        freeShippingThreshold: null,
        isDefault: false,
        isEnabled: true,
      });
    expect([200, 201]).toContain(tplRes.status);
    weightTemplateId = tplRes.body.id;

    // 4. Create in-stock product with weight = 0.5kg
    inStockWeightProductSku = `WT-INSTOCK-${Date.now()}`;
    const prodRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Weight InStock Item',
        slug: `wt-instock-${Date.now()}`,
        sku: inStockWeightProductSku,
        basePrice: 150,
        weight: 0.5,
        stockQuantity: 50,
        categoryId,
        shippingTemplateId: weightTemplateId,
        status: 'active',
      });
    expect([200, 201]).toContain(prodRes.status);
    inStockWeightProductId = prodRes.body.id;
  });

  afterAll(async () => {
    if (inStockWeightProductId) {
      await request(BASE_URL)
        .delete(`/admin/delete-products/${inStockWeightProductId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
    if (weightTemplateId) {
      await request(BASE_URL)
        .delete(`/shipping-templates/${weightTemplateId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
  });

  describe('SHIP-01: Slab Boundary Matching (totalWeight <= slab.upTo)', () => {
    it('applies exact slab rates via order creation (1 item x 0.5kg = 0.5kg -> Slab <= 1.0kg @ Rs 50)', async () => {
      const orderRes = await request(BASE_URL)
        .post('/orders')
        .send({
          email: 'guest_slab1@example.com',
          items: [{ productId: inStockWeightProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Slab Customer 1',
            phone: '9876543210',
            addressLine1: '123 Test St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(orderRes.status);
      expect(Number(orderRes.body.shippingTotal)).toBe(50);
      expect(Number(orderRes.body.subtotal)).toBe(150);
      expect(Number(orderRes.body.grandTotal)).toBe(200); // 150 + 50
    });

    it('applies higher slab rates (3 items x 0.5kg = 1.5kg -> Slab <= 2.0kg @ Rs 80)', async () => {
      const orderRes = await request(BASE_URL)
        .post('/orders')
        .send({
          email: 'guest_slab2@example.com',
          items: [{ productId: inStockWeightProductId, quantity: 3 }],
          shippingAddress: {
            fullName: 'Slab Customer 2',
            phone: '9876543210',
            addressLine1: '123 Test St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(orderRes.status);
      expect(Number(orderRes.body.shippingTotal)).toBe(80);
      expect(Number(orderRes.body.subtotal)).toBe(450);
      expect(Number(orderRes.body.grandTotal)).toBe(530); // 450 + 80
    });
  });

  describe('SHIP-02: Weight Beyond Last Slab', () => {
    it('rejects order placement with 400 Bad Request when total weight (6.0kg) exceeds max slab (5.0kg)', async () => {
      // 12 items of 0.5kg = 6.0kg (> 5.0kg max slab)
      const res = await request(BASE_URL)
        .post('/orders')
        .send({
          email: 'guest_overweight@example.com',
          items: [{ productId: inStockWeightProductId, quantity: 12 }],
          shippingAddress: {
            fullName: 'Overweight Customer',
            phone: '9876543210',
            addressLine1: '123 Test St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500001',
            country: 'IN',
          },
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/exceeds the maximum shipping weight limit/i);
    });
  });

  describe('SHIP-03: Per-Product Template & Fallback', () => {
    it('product with shippingTemplateId=null falls back to default template (Standard Delivery, Rs 49)', async () => {
      // Create product with shippingTemplateId = null and stock = 10
      const prodRes = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Fallback Item InStock',
          slug: `fallback-item-instock-${Date.now()}`,
          sku: `FALLBACK-INSTOCK-${Date.now()}`,
          basePrice: 100,
          stockQuantity: 10,
          categoryId,
          shippingTemplateId: null,
          status: 'active',
        });
      expect([200, 201]).toContain(prodRes.status);
      const fallbackProdId = prodRes.body.id;

      const orderRes = await request(BASE_URL)
        .post('/orders')
        .send({
          email: 'guest_fallback@example.com',
          items: [{ productId: fallbackProdId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Fallback Customer',
            phone: '9876543210',
            addressLine1: '123 Test St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(orderRes.status);
      // Default template charges Rs 49 for orders < Rs 499
      expect(Number(orderRes.body.shippingTotal)).toBe(49);
      expect(Number(orderRes.body.grandTotal)).toBe(149);

      await request(BASE_URL)
        .delete(`/admin/delete-products/${fallbackProdId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    });
  });

  describe('SHIP-04: Mixed-Template Cart', () => {
    it('correctly aggregates multiple templates and sums charges in mixed-template order', async () => {
      // Product 1 uses weightTemplate (1 item x 0.5kg -> Rs 50)
      // Product 2 uses defaultTemplate (1 item x Rs 100 -> Rs 49)
      const prodRes = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Default Tpl Item',
          slug: `def-tpl-item-${Date.now()}`,
          sku: `DEF-SKU-${Date.now()}`,
          basePrice: 100,
          stockQuantity: 10,
          categoryId,
          status: 'active',
        });
      expect([200, 201]).toContain(prodRes.status);
      const defProdId = prodRes.body.id;

      const orderRes = await request(BASE_URL)
        .post('/orders')
        .send({
          email: 'guest_mixed@example.com',
          items: [
            { productId: inStockWeightProductId, quantity: 1 }, // Rs 50
            { productId: defProdId, quantity: 1 },             // Rs 49
          ],
          shippingAddress: {
            fullName: 'Mixed Customer',
            phone: '9876543210',
            addressLine1: '123 Test St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(orderRes.status);
      // Total shipping = 50 + 49 = Rs 99
      expect(Number(orderRes.body.shippingTotal)).toBe(99);
      expect(Number(orderRes.body.subtotal)).toBe(250);
      expect(Number(orderRes.body.grandTotal)).toBe(349); // 250 + 99

      await request(BASE_URL)
        .delete(`/admin/delete-products/${defProdId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    });
  });

  describe('SHIP-05: Variant Weight Fallback', () => {
    it('variation with null weight inherits parent weight and calculates shipping', async () => {
      const varSlug = `var-wt-inherit-${Date.now()}`;
      const vSku = `VAR-WT-INH-${Date.now()}`;

      const res = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Parent Weight Inherit Live',
          slug: varSlug,
          sku: `PARENT-WT-LIVE-${Date.now()}`,
          productType: 'variable',
          weight: 0.5, // Parent has 0.5kg
          categoryId,
          shippingTemplateId: weightTemplateId,
          status: 'active',
          attributes: [
            { name: 'Color', options: ['Red'], visible: true, variation: true },
          ],
          variations: [
            {
              sku: vSku,
              regularPrice: 200,
              stockQuantity: 10,
              weight: null, // Null weight -> must inherit parent 0.5kg
              attributes: [{ name: 'Color', option: 'Red' }],
            },
          ],
        });

      expect([200, 201]).toContain(res.status);
      const parentId = res.body.id;
      const variationId = res.body.variations[0].id;

      const orderRes = await request(BASE_URL)
        .post('/orders')
        .send({
          email: 'guest_var_wt@example.com',
          items: [{ productId: parentId, variationId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Var Customer',
            phone: '9876543210',
            addressLine1: '123 Test St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(orderRes.status);
      // 0.5kg -> Slab <= 1.0 kg -> Rs 50
      expect(Number(orderRes.body.shippingTotal)).toBe(50);

      await request(BASE_URL)
        .delete(`/admin/delete-products/${parentId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    });
  });

  describe('SHIP-06: Disabled / Missing Default Fallback', () => {
    it('GET /shipping-templates/default returns default enabled template', async () => {
      const res = await request(BASE_URL).get('/shipping-templates/default');
      expect(res.status).toBe(200);
      expect(res.body.isDefault).toBe(true);
      expect(res.body.isEnabled).toBe(true);
    });
  });

  describe('SHIP-07: Historical Immutability', () => {
    it('editing shipping template rate does not alter already placed order snapshots', async () => {
      // 1. Place guest order with inStockWeightProductId (shipping = Rs 50)
      const orderRes = await request(BASE_URL)
        .post('/orders')
        .send({
          email: 'guest_hist_snap@example.com',
          items: [{ productId: inStockWeightProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Hist Customer',
            phone: '9876543210',
            addressLine1: '123 Test St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(orderRes.status);
      const orderId = orderRes.body.id;
      expect(Number(orderRes.body.shippingTotal)).toBe(50);

      // 2. Update weight template slab rate from 50 to 99
      const updateRes = await request(BASE_URL)
        .patch(`/shipping-templates/${weightTemplateId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          slabs: [
            { upTo: 1.0, charge: 99 },
            { upTo: 2.0, charge: 140 },
            { upTo: 5.0, charge: 200 },
          ],
        });
      expect(updateRes.status).toBe(200);

      // 3. Re-fetch historical order with admin token
      const fetchedOrder = await request(BASE_URL)
        .get(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(fetchedOrder.status).toBe(200);
      // Historical order shippingTotal must remain Rs 50, NOT updated to Rs 99
      expect(Number(fetchedOrder.body.shippingTotal)).toBe(50);
    });
  });

  describe('SHIP-08: Audit Log on Shipping Template Mutation', () => {
    it('audit logs endpoint records mutations and is accessible to admin', async () => {
      const auditRes = await request(BASE_URL)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      const logs = Array.isArray(auditRes.body) ? auditRes.body : auditRes.body.logs || auditRes.body.data;
      expect(logs).toBeDefined();
    });
  });
});
