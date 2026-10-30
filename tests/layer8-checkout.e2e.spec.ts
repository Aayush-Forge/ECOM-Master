import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { escapeHtml } from '../notifications/templates/email-templates';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 8: Guest Checkout, Address & Order Placement (Live Server E2E)', () => {
  let adminToken: string;
  let editorToken: string;
  let categoryId: string;
  let pricingTestProductId: string;
  let snapshotTestProductId: string;
  let raceTestProductId: string;
  const createdProductIds: string[] = [];

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

    // Get active category
    const catRes = await request(BASE_URL).get('/categories');
    const categories = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
    categoryId = categories[0].id;

    // 1. Product for Price Manipulation Test (Rs. 350.00)
    const p1 = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Server Pricing Shield Item',
        slug: `server-pricing-shield-${Date.now()}`,
        sku: `PRICING-SHIELD-${Date.now()}`,
        basePrice: 350.0,
        stockQuantity: 50,
        categoryId,
        shippingTemplateId: null, // default template (Rs 49 below 499)
        status: 'active',
      });
    expect([200, 201]).toContain(p1.status);
    pricingTestProductId = p1.body.id;
    createdProductIds.push(pricingTestProductId);

    // 2. Product for Snapshot Immutability Test (Rs. 200.00)
    const p2 = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Original Incense 100g',
        slug: `original-incense-${Date.now()}`,
        sku: `ORIG-INCENSE-${Date.now()}`,
        basePrice: 200.0,
        stockQuantity: 50,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(p2.status);
    snapshotTestProductId = p2.body.id;
    createdProductIds.push(snapshotTestProductId);

    // 3. Product with Stock = 1 for Last-Unit Race Test
    const p3 = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Rare Antique Artifact (Stock: 1)',
        slug: `rare-antique-${Date.now()}`,
        sku: `RARE-ANTIQUE-${Date.now()}`,
        basePrice: 750.0,
        stockQuantity: 1,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(p3.status);
    raceTestProductId = p3.body.id;
    createdProductIds.push(raceTestProductId);
  });

  afterAll(async () => {
    for (const prodId of createdProductIds) {
      await request(BASE_URL)
        .delete(`/admin/delete-products/${prodId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
  });

  // ==========================================
  // ORD-01: Server-Side Price Calculation
  // ==========================================
  describe('ORD-01: Server-Side Price Calculation', () => {
    it('ORD-01.1: rejects client-submitted manipulated unitPrice and grandTotal with 400 Bad Request (forbidNonWhitelisted)', async () => {
      // Attacker attempts to buy Rs. 350 product for Rs. 1.00 by injecting forged pricing fields
      const tamperedPayload = {
        email: 'tamper.tester@example.com',
        items: [
          {
            productId: pricingTestProductId,
            quantity: 1,
            unitPrice: 1.0, // FORGED
            lineTotal: 1.0, // FORGED
          },
        ],
        shippingTotal: 0.0, // FORGED
        grandTotal: 1.0, // FORGED
        shippingAddress: {
          fullName: 'Security Tester',
          phone: '9876543210',
          addressLine1: 'Cyber Security Lab, Plot 42',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
          country: 'IN',
        },
      };

      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.1')
        .send(tamperedPayload);

      // ValidationPipe with forbidNonWhitelisted: true strictly blocks injected pricing properties
      expect(res.status).toBe(400);
      const errMsg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(errMsg).toMatch(/should not exist/i);
    });

    it('ORD-01.2: calculates subtotal, shipping, and grandTotal exclusively from database prices', async () => {
      const validPayload = {
        email: 'honest.buyer@example.com',
        items: [{ productId: pricingTestProductId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Honest Buyer',
          phone: '9876543210',
          addressLine1: 'Cyber Security Lab, Plot 42',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
          country: 'IN',
        },
      };

      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.9')
        .send(validPayload);

      expect([200, 201]).toContain(res.status);
      const createdOrder = res.body;

      // Server-side calculation verification:
      // DB price is 350.00. Subtotal must be 350, shipping 49, grandTotal 399
      expect(Number(createdOrder.subtotal)).toBe(350);
      expect(Number(createdOrder.shippingTotal)).toBe(49);
      expect(Number(createdOrder.grandTotal)).toBe(399);

      // Verify item snapshots in DB match actual catalog price
      expect(createdOrder.items).toHaveLength(1);
      expect(Number(createdOrder.items[0].unitPriceSnapshot)).toBe(350);
      expect(Number(createdOrder.items[0].lineTotal)).toBe(350);
    });
  });

  // ==========================================
  // ORD-02: Pincode & Address Validation
  // ==========================================
  describe('ORD-02: Pincode & Address Validation', () => {
    it('ORD-02.1: accepts valid 6-digit Indian PIN and complete address fields', async () => {
      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.2')
        .send({
          email: 'valid.address@example.com',
          items: [{ productId: pricingTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Aditi Sharma',
            phone: '9876543210',
            addressLine1: 'Flat 302, Green Meadows',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.id).toBeDefined();
    });

    it('ORD-02.2: rejects missing or empty postalCode with 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.3')
        .send({
          email: 'invalid.pin@example.com',
          items: [{ productId: pricingTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Missing Pin User',
            phone: '9876543210',
            addressLine1: 'No Pin Street',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '', // EMPTY
            country: 'IN',
          },
        });

      expect(res.status).toBe(400);
      const errMsg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(errMsg).toMatch(/postalCode should not be empty/i);
    });

    it('ORD-02.3: rejects incomplete address (missing required addressLine1, city, state) with 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.4')
        .send({
          email: 'incomplete@example.com',
          items: [{ productId: pricingTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Incomplete User',
            phone: '9876543210',
            postalCode: '560001',
            // Missing addressLine1, city, state
          },
        });

      expect(res.status).toBe(400);
      const errMsg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(errMsg).toMatch(/addressLine1|city|state/i);
    });

    it('ORD-02.4: rejects guest checkout when email is missing or empty', async () => {
      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.5')
        .send({
          // email omitted
          items: [{ productId: pricingTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'No Email Guest',
            phone: '9876543210',
            addressLine1: 'Some Street',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'IN',
          },
        });

      expect(res.status).toBe(400);
      const errMsg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(errMsg).toMatch(/Email is required for guest checkout/i);
    });

    it('ORD-02.5: rejects invalid email syntax with 400 Bad Request', async () => {
      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.6')
        .send({
          email: 'not-a-valid-email-string',
          items: [{ productId: pricingTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Bad Email User',
            phone: '9876543210',
            addressLine1: 'Some Street',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'IN',
          },
        });

      expect(res.status).toBe(400);
      const errMsg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(errMsg).toMatch(/email must be an email/i);
    });
  });

  // ==========================================
  // ORD-03: Initial Order Status
  // ==========================================
  describe('ORD-03: Initial Order Status', () => {
    it('ORD-03: sets exact status "payment_pending" and generates formatted orderNumber (SDOxxxx)', async () => {
      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.7')
        .send({
          email: 'status.test@example.com',
          items: [{ productId: pricingTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Status Checker',
            phone: '9876543210',
            addressLine1: 'Status Lane',
            city: 'Chennai',
            state: 'Tamil Nadu',
            postalCode: '600001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(res.status);
      const order = res.body;

      // Exact status check
      expect(order.status).toBe('payment_pending');

      // Order number format check (SDO + sequence digits)
      expect(order.orderNumber).toMatch(/^SDO\d+$/);

      // Verify DB persistence via admin order retrieval
      const adminGet = await request(BASE_URL)
        .get(`/admin/orders/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminGet.status).toBe(200);
      expect(adminGet.body.status).toBe('payment_pending');
      expect(adminGet.body.orderNumber).toBe(order.orderNumber);
    });
  });

  // ==========================================
  // ORD-04: Snapshot Storage & Catalog Immutability
  // ==========================================
  describe('ORD-04: Snapshot Storage & Catalog Immutability', () => {
    it('ORD-04: captures frozen snapshots of product title, SKU, price, and address; remains unchanged when catalog product is updated', async () => {
      // 1. Create order for Original Incense 100g (Rs. 200)
      const res = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.1.8')
        .send({
          email: 'snapshot.test@example.com',
          items: [{ productId: snapshotTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Snapshot Customer',
            phone: '9988776655',
            addressLine1: 'Flat 101, Heritage Tower',
            addressLine2: 'Near Central Park',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(res.status);
      const orderId = res.body.id;

      // Verify initial snapshot values
      expect(res.body.items[0].titleSnapshot).toBe('Original Incense 100g');
      expect(Number(res.body.items[0].unitPriceSnapshot)).toBe(200);
      expect(Number(res.body.grandTotal)).toBe(249); // 200 + 49 shipping

      const shippingAddr = res.body.addresses.find((a: any) => a.type === 'shipping');
      expect(shippingAddr).toBeDefined();
      expect(shippingAddr.fullName).toBe('Snapshot Customer');
      expect(shippingAddr.phone).toBe('9988776655');
      expect(shippingAddr.addressLine1).toBe('Flat 101, Heritage Tower');
      expect(shippingAddr.addressLine2).toBe('Near Central Park');
      expect(shippingAddr.city).toBe('Bengaluru');
      expect(shippingAddr.state).toBe('Karnataka');
      expect(shippingAddr.postalCode).toBe('560001');

      // 2. Mutate catalog product: change title and increase basePrice to Rs. 999
      const updateProdRes = await request(BASE_URL)
        .patch(`/admin/update-products/${snapshotTestProductId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Tampered Incense 100g (Modified Title)',
          basePrice: 999.0,
        });
      expect(updateProdRes.status).toBe(200);
      expect(updateProdRes.body.title).toBe('Tampered Incense 100g (Modified Title)');
      expect(Number(updateProdRes.body.basePrice)).toBe(999);

      // 3. Re-fetch order via admin endpoint: verify snapshots remain completely intact
      const orderCheck = await request(BASE_URL)
        .get(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(orderCheck.status).toBe(200);
      expect(orderCheck.body.items[0].titleSnapshot).toBe('Original Incense 100g');
      expect(Number(orderCheck.body.items[0].unitPriceSnapshot)).toBe(200);
      expect(Number(orderCheck.body.grandTotal)).toBe(249);
    });
  });

  // ==========================================
  // ORD-05: Informational: Deferred Feature - Last-Unit Race Condition
  // ==========================================
  describe('ORD-05 [Informational: Deferred]: Last-unit race condition observation', () => {
    it('observes and records concurrent checkout behavior for final stock unit (stock = 1)', async () => {
      // Dispatch 2 concurrent checkout requests for the same product with stock = 1
      const orderA = {
        email: 'buyerA@example.com',
        items: [{ productId: raceTestProductId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Buyer A',
          phone: '9876543210',
          addressLine1: 'Lane A',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
        },
      };

      const orderB = {
        email: 'buyerB@example.com',
        items: [{ productId: raceTestProductId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Buyer B',
          phone: '9876543211',
          addressLine1: 'Lane B',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
        },
      };

      const [resA, resB] = await Promise.all([
        request(BASE_URL)
          .post('/orders')
          .set('X-Forwarded-For', '10.10.2.1')
          .send(orderA),
        request(BASE_URL)
          .post('/orders')
          .set('X-Forwarded-For', '10.10.2.2')
          .send(orderB),
      ]);

      // Record actual behavior:
      // Since strict locking and overselling prevention were deferred, both orders succeed in payment_pending
      expect([200, 201]).toContain(resA.status);
      expect([200, 201]).toContain(resB.status);
      expect(resA.body.id).toBeDefined();
      expect(resB.body.id).toBeDefined();

      // Check product stock in DB
      const prodRes = await request(BASE_URL)
        .get(`/products/${raceTestProductId}?admin=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(prodRes.status).toBe(200);
      const raceProd = prodRes.body;

      // Document actual stock quantity: stock decrement is deferred to payment/fulfillment
      expect(raceProd).toBeDefined();
      expect(Number(raceProd.stockQuantity)).toBe(1);
    });
  });

  // ==========================================
  // ORD-06: Informational: Deferred Feature - Restock on Cancellation
  // ==========================================
  describe('ORD-06 [Informational: Deferred]: Restock on order cancellation observation', () => {
    it('observes and records inventory behavior upon order cancellation via admin', async () => {
      // 1. Create an order
      const orderRes = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.3.1')
        .send({
          email: 'cancel.user@example.com',
          items: [{ productId: pricingTestProductId, quantity: 2 }],
          shippingAddress: {
            fullName: 'Cancel User',
            phone: '9876543210',
            addressLine1: 'Cancel Lane',
            city: 'Delhi',
            state: 'Delhi',
            postalCode: '110001',
            country: 'IN',
          },
        });
      expect([200, 201]).toContain(orderRes.status);
      const orderId = orderRes.body.id;

      // 2. Cancel the order via admin status transition
      const cancelRes = await request(BASE_URL)
        .patch(`/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          toStatus: 'cancelled',
          note: 'Customer requested cancellation prior to payment',
        });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');

      // 3. Observe catalog stock behavior
      const prodRes = await request(BASE_URL)
        .get(`/products/${pricingTestProductId}?admin=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(prodRes.status).toBe(200);
      const targetProd = prodRes.body;

      // Document actual behavior: stock was not decremented on order create, so cancellation leaves stock unchanged (50)
      expect(Number(targetProd.stockQuantity)).toBe(50);
    });
  });

  // ==========================================
  // ORD-07: XSS Injection Defense
  // ==========================================
  describe('ORD-07: XSS Injection Defense', () => {
    it('safely handles <script> and HTML tags in guest name and notes without execution or data corruption', async () => {
      const maliciousName = '<script>alert("XSS")</script> <b>Dr. Hacker</b>';

      // 1. Place order with HTML/script payload in fullName
      const orderRes = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.10.4.1')
        .send({
          email: 'xss.test@example.com',
          items: [{ productId: pricingTestProductId, quantity: 1 }],
          shippingAddress: {
            fullName: maliciousName,
            phone: '9876543210',
            addressLine1: '123 Safe St',
            city: 'Kolkata',
            state: 'West Bengal',
            postalCode: '700001',
            country: 'IN',
          },
        });

      expect([200, 201]).toContain(orderRes.status);
      const orderId = orderRes.body.id;

      // 2. Fetch order via admin endpoint: verify string is stored verbatim and returned safely as JSON
      const adminGet = await request(BASE_URL)
        .get(`/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminGet.status).toBe(200);
      const shippingAddr = adminGet.body.addresses.find((a: any) => a.type === 'shipping');
      expect(shippingAddr.fullName).toBe(maliciousName);

      // 3. Verify transactional email HTML escaping function protects against script injection
      const escaped = escapeHtml(maliciousName);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &lt;b&gt;Dr. Hacker&lt;/b&gt;');
      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('<b>');
    });
  });
});
