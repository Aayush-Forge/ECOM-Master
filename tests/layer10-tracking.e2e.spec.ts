import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 10: Public Order Tracking & Anti-IDOR (Live Server E2E)', () => {
  let adminToken: string;
  let editorToken: string;
  let categoryId: string;
  let trackingProductId: string;
  let trackingOrderId: string;
  let trackingOrderNumber: string;
  const targetPhone = '9876543210';
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

    // Create an in-stock product
    const prodRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Tracking Test Item',
        slug: `tracking-item-${Date.now()}`,
        sku: `TRK-ITEM-${Date.now()}`,
        basePrice: 600.0,
        stockQuantity: 50,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(prodRes.status);
    trackingProductId = prodRes.body.id;
    createdProductIds.push(trackingProductId);

    // Place an order for tracking verification
    const ordRes = await request(BASE_URL)
      .post('/orders')
      .set('X-Forwarded-For', '10.30.1.1')
      .send({
        email: 'tracking.customer@example.com',
        items: [{ productId: trackingProductId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Suresh Kumar',
          phone: targetPhone,
          addressLine1: 'Flat 402, Sai Residency',
          addressLine2: 'Road No 3, Banjara Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500034',
          country: 'IN',
        },
      });
    expect([200, 201]).toContain(ordRes.status);
    trackingOrderId = ordRes.body.id;
    trackingOrderNumber = ordRes.body.orderNumber;

    // Transition order through allowed states: payment_pending -> paid -> processing -> shipped
    const payRes = await request(BASE_URL)
      .patch(`/admin/orders/${trackingOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'paid' });
    expect(payRes.status).toBe(200);

    const procRes = await request(BASE_URL)
      .patch(`/admin/orders/${trackingOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'processing' });
    expect(procRes.status).toBe(200);

    const shipRes = await request(BASE_URL)
      .patch(`/admin/orders/${trackingOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        toStatus: 'shipped',
        trackingUrl: 'https://speedpost.indiapost.gov.in/track/SP987654321IN',
        trackingNumber: 'SP987654321IN',
      });
    expect(shipRes.status).toBe(200);
  });

  afterAll(async () => {
    for (const prodId of createdProductIds) {
      await request(BASE_URL)
        .delete(`/admin/delete-products/${prodId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
  });

  // ==========================================
  // TRK-01: Valid Lookup
  // ==========================================
  describe('TRK-01: Valid Tracking Lookup', () => {
    it('TRK-01: valid orderNumber + matching phone returns public tracking timeline and carrier details', async () => {
      const res = await request(BASE_URL)
        .post('/orders/track')
        .set('X-Forwarded-For', '10.30.1.2')
        .send({
          orderNumber: trackingOrderNumber,
          phone: targetPhone,
        });

      expect([200, 201]).toContain(res.status);
      const trackingData = res.body;

      // Status and identifiers
      expect(trackingData.orderNumber).toBe(trackingOrderNumber);
      expect(trackingData.status).toBe('shipped');
      expect(trackingData.trackingUrl).toBe('https://speedpost.indiapost.gov.in/track/SP987654321IN');
      expect(trackingData.trackingNumber).toBe('SP987654321IN');

      // Timeline / status history
      expect(Array.isArray(trackingData.statusHistory)).toBe(true);
      expect(trackingData.statusHistory.length).toBeGreaterThanOrEqual(2);
      expect(trackingData.statusHistory[0].toStatus).toBe('shipped');

      // Items array
      expect(Array.isArray(trackingData.items)).toBe(true);
      expect(trackingData.items).toHaveLength(1);
      expect(trackingData.items[0].titleSnapshot).toBe('Tracking Test Item');
    });
  });

  // ==========================================
  // TRK-02: Rate Limiting
  // ==========================================
  describe('TRK-02: Rate Limiting Enforcement', () => {
    it('TRK-02: consecutive tracking requests exceeding limit returns 429 Too Many Requests', async () => {
      const ip = '10.30.2.99';
      let lastStatus = 200;

      // Fire 11 requests from same IP within the 60s window
      for (let i = 1; i <= 11; i++) {
        const res = await request(BASE_URL)
          .post('/orders/track')
          .set('X-Forwarded-For', ip)
          .send({
            orderNumber: trackingOrderNumber,
            phone: targetPhone,
          });
        lastStatus = res.status;
      }

      // Expected per plan: Rate limiter triggers 429 on excessive attempts
      expect(lastStatus).toBe(429);
    });
  });

  // ==========================================
  // TRK-03: Uniform Not Found Response (Anti-Enumeration)
  // ==========================================
  describe('TRK-03: Uniform Not Found Response (Anti-Enumeration)', () => {
    it('TRK-03: non-existent order number and mismatched phone return identical 404 Not Found response', async () => {
      // 1. Non-existent order number + any phone
      const nonExistentRes = await request(BASE_URL)
        .post('/orders/track')
        .set('X-Forwarded-For', '10.30.3.1')
        .send({
          orderNumber: 'SDO999999999',
          phone: targetPhone,
        });

      // 2. Existing order number + mismatched phone
      const wrongPhoneRes = await request(BASE_URL)
        .post('/orders/track')
        .set('X-Forwarded-For', '10.30.3.2')
        .send({
          orderNumber: trackingOrderNumber,
          phone: '9111111111', // WRONG PHONE
        });

      // Assert identical HTTP 404 status
      expect(nonExistentRes.status).toBe(404);
      expect(wrongPhoneRes.status).toBe(404);

      // Assert identical error payload structure and message (prevents timing/enumeration attacks)
      expect(nonExistentRes.body.statusCode).toBe(404);
      expect(wrongPhoneRes.body.statusCode).toBe(404);
      expect(nonExistentRes.body.message).toBe(wrongPhoneRes.body.message);
      expect(nonExistentRes.body.error).toBe(wrongPhoneRes.body.error);
    });
  });

  // ==========================================
  // TRK-04: Phone Normalization
  // ==========================================
  describe('TRK-04: Phone Number Normalization', () => {
    it('TRK-04.1: resolves order with +91 country code prefix (+919876543210)', async () => {
      const res = await request(BASE_URL)
        .post('/orders/track')
        .set('X-Forwarded-For', '10.30.4.1')
        .send({
          orderNumber: trackingOrderNumber,
          phone: `+91${targetPhone}`,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.orderNumber).toBe(trackingOrderNumber);
    });

    it('TRK-04.2: resolves order with spaced formatting (98765 43210)', async () => {
      const res = await request(BASE_URL)
        .post('/orders/track')
        .set('X-Forwarded-For', '10.30.4.2')
        .send({
          orderNumber: trackingOrderNumber,
          phone: `${targetPhone.slice(0, 5)} ${targetPhone.slice(5)}`,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.orderNumber).toBe(trackingOrderNumber);
    });

    it('TRK-04.3: resolves order with hyphenated prefix format (+91-98765-43210)', async () => {
      const res = await request(BASE_URL)
        .post('/orders/track')
        .set('X-Forwarded-For', '10.30.4.3')
        .send({
          orderNumber: trackingOrderNumber,
          phone: `+91-${targetPhone.slice(0, 5)}-${targetPhone.slice(5)}`,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.orderNumber).toBe(trackingOrderNumber);
    });
  });

  // ==========================================
  // TRK-05: Anti-IDOR & Sensitive Data Leakage
  // ==========================================
  describe('TRK-05: Anti-IDOR Privacy Boundaries', () => {
    it('TRK-05: public tracking response never exposes payment signatures, secrets, or internal user credentials', async () => {
      const res = await request(BASE_URL)
        .post('/orders/track')
        .set('X-Forwarded-For', '10.30.5.1')
        .send({
          orderNumber: trackingOrderNumber,
          phone: targetPhone,
        });

      expect([200, 201]).toContain(res.status);
      const data = res.body;

      // 1. Payment secrets and signatures must never be exposed
      expect(data.razorpaySignature).toBeUndefined();
      expect(data.paymentSignature).toBeUndefined();
      expect(data.payments).toBeUndefined();

      // 2. Internal password hash / credentials must never be exposed
      if (data.customer) {
        expect(data.customer.passwordHash).toBeUndefined();
        expect(data.customer.password).toBeUndefined();
      }
    });
  });
});
