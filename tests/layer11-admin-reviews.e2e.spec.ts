import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 11: Admin Portal Operations & Reviews Moderation (Live Server E2E)', () => {
  let adminToken: string;
  let editorToken: string;
  let readOnlyToken: string;
  let categoryId: string;
  let reviewProductId: string;
  let reviewOrderId: string;
  const verifiedEmail = 'verified.buyer@example.com';
  const verifiedPhone = '9876543210';
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
    readOnlyToken = jwt.sign(
      { sub: 'ef1c1d0b-39f7-40ef-be66-60e471b8dc70', email: 'read_only@sridattam.com', role: 'read_only' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // Get active category
    const catRes = await request(BASE_URL).get('/categories');
    const categories = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
    categoryId = categories[0].id;

    // Create product for review and order testing
    const prodRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Review Moderation Prod',
        slug: `rev-mod-prod-${Date.now()}`,
        sku: `REV-MOD-${Date.now()}`,
        basePrice: 550.0,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(prodRes.status);
    reviewProductId = prodRes.body.id;
    createdProductIds.push(reviewProductId);

    // Place an order for this product
    const ordRes = await request(BASE_URL)
      .post('/orders')
      .set('X-Forwarded-For', '10.40.1.1')
      .send({
        email: verifiedEmail,
        items: [{ productId: reviewProductId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Verified Buyer',
          phone: verifiedPhone,
          addressLine1: '404 Moderation St',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
          country: 'IN',
        },
      });
    expect([200, 201]).toContain(ordRes.status);
    reviewOrderId = ordRes.body.id;
  });

  afterAll(async () => {
    for (const prodId of createdProductIds) {
      await request(BASE_URL)
        .delete(`/admin/delete-products/${prodId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
  });

  // ==========================================
  // ADM-01: Order Status Progression
  // ==========================================
  describe('ADM-01: Order Status Progression (paid -> processing -> shipped -> delivered)', () => {
    it('ADM-01.1: prevents illegal status jumps (cannot jump from payment_pending directly to shipped)', async () => {
      const res = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({
          toStatus: 'shipped',
          trackingUrl: 'https://speedpost.gov.in/track/123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid status transition from 'payment_pending' to 'shipped'/i);
    });

    it('ADM-01.2: progresses status payment_pending -> paid -> processing', async () => {
      // Step 1: payment_pending -> paid
      const payRes = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ toStatus: 'paid' });
      expect(payRes.status).toBe(200);
      expect(payRes.body.status).toBe('paid');

      // Step 2: paid -> processing
      const procRes = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ toStatus: 'processing' });
      expect(procRes.status).toBe(200);
      expect(procRes.body.status).toBe('processing');
    });

    it('ADM-01.3: enforces https tracking URL requirement when transitioning to shipped', async () => {
      // Missing trackingUrl
      const missingUrlRes = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ toStatus: 'shipped' });
      expect(missingUrlRes.status).toBe(400);
      expect(missingUrlRes.body.message).toMatch(/Tracking URL is required when status is shipped/i);

      // Insecure http trackingUrl
      const insecureUrlRes = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({
          toStatus: 'shipped',
          trackingUrl: 'http://insecure-post.com/track',
        });
      expect(insecureUrlRes.status).toBe(400);
      expect(insecureUrlRes.body.message).toMatch(/Tracking URL must be a valid https URL/i);
    });

    it('ADM-01.4: transitions processing -> shipped with valid tracking details', async () => {
      const shipRes = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({
          toStatus: 'shipped',
          trackingUrl: 'https://track.delhivery.com/p/12345678',
          trackingNumber: 'DEL12345678',
        });
      expect(shipRes.status).toBe(200);
      expect(shipRes.body.status).toBe('shipped');
      expect(shipRes.body.trackingUrl).toBe('https://track.delhivery.com/p/12345678');
      expect(shipRes.body.trackingNumber).toBe('DEL12345678');
    });

    it('ADM-01.5: transitions shipped -> delivered and locks terminal state against modifications', async () => {
      const delRes = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ toStatus: 'delivered' });
      expect(delRes.status).toBe(200);
      expect(delRes.body.status).toBe('delivered');

      // Terminal state defense: delivered orders cannot transition to any other state
      const invalidNextRes = await request(BASE_URL)
        .patch(`/admin/orders/${reviewOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ toStatus: 'shipped' });
      expect(invalidNextRes.status).toBe(400);
      expect(invalidNextRes.body.message).toMatch(/Invalid status transition from 'delivered'/i);
    });
  });

  // ==========================================
  // ADM-02: Review Submission & Verified Purchase Gate
  // ==========================================
  describe('ADM-02: Review Submission & Verified Purchase Gate', () => {
    let createdReviewId: string;

    it('ADM-02.1: blocks unverified customer who has not purchased or received the product (403 Forbidden)', async () => {
      const res = await request(BASE_URL)
        .post('/reviews')
        .send({
          productId: reviewProductId,
          customerName: 'Fake Reviewer',
          stars: 5,
          description: 'Never bought this product but leaving 5 stars.',
          email: 'unverified.stranger@example.com',
          phone: '9111222333',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only customers who have received this product can submit a review/i);
    });

    it('ADM-02.2: permits verified buyer with delivered order to submit review (isVerifiedBuyer: true)', async () => {
      const res = await request(BASE_URL)
        .post('/reviews')
        .send({
          productId: reviewProductId,
          customerName: 'Verified Buyer',
          stars: 5,
          description: 'Authentic handmade quality, soothing divine aroma. Highly recommended!',
          email: verifiedEmail,
          phone: verifiedPhone,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.id).toBeDefined();
      expect(res.body.productId).toBe(reviewProductId);
      expect(res.body.isVerifiedBuyer).toBe(true);
      expect(res.body.stars).toBe(5);
      createdReviewId = res.body.id;
    });

    it('ADM-02.3: prevents duplicate review submissions from same buyer for same product (409 Conflict)', async () => {
      const res = await request(BASE_URL)
        .post('/reviews')
        .send({
          productId: reviewProductId,
          customerName: 'Verified Buyer Again',
          stars: 4,
          description: 'Trying to review again.',
          email: verifiedEmail,
          phone: verifiedPhone,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/You have already submitted a review for this product/i);
    });

    it('ADM-02.4: displays verified review on public catalog and updates average rating', async () => {
      // 1. Public product reviews endpoint
      const listRes = await request(BASE_URL).get(`/reviews?productId=${reviewProductId}`);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      const found = listRes.body.find((r: any) => r.id === createdReviewId);
      expect(found).toBeDefined();
      expect(found.isVerifiedBuyer).toBe(true);

      // 2. Editor review summaries endpoint
      const sumRes = await request(BASE_URL)
        .get(`/reviews/products-summary`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(sumRes.status).toBe(200);
      const prodSummary = sumRes.body.find((p: any) => p.id === reviewProductId);
      expect(prodSummary).toBeDefined();
      expect(prodSummary.reviewCount).toBe(1);
      expect(prodSummary.averageRating).toBe('5.0');
    });

    it('ADM-02.5: allows staff with EDITOR role to moderate and delete review; restricts anonymous', async () => {
      // Anonymous delete rejected (401 Unauthorized)
      const anonDel = await request(BASE_URL).delete(`/reviews/${createdReviewId}`);
      expect(anonDel.status).toBe(401);

      // Editor delete allowed (200 OK)
      const editDel = await request(BASE_URL)
        .delete(`/reviews/${createdReviewId}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(editDel.status).toBe(200);

      // Verify review is no longer in public listing
      const afterList = await request(BASE_URL).get(`/reviews?productId=${reviewProductId}`);
      expect(afterList.body.find((r: any) => r.id === createdReviewId)).toBeUndefined();
    });
  });

  // ==========================================
  // ADM-03: Review Injection Defense
  // ==========================================
  describe('ADM-03: Review Injection Defense', () => {
    let secondOrderId: string;
    const xssEmail = 'xss.buyer@example.com';
    const xssPhone = '9876543299';
    let xssReviewId: string;

    beforeAll(async () => {
      // Place and deliver an order for XSS testing
      const ordRes = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.40.1.2')
        .send({
          email: xssEmail,
          items: [{ productId: reviewProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'XSS Buyer',
            phone: xssPhone,
            addressLine1: '123 Security Blvd',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500081',
            country: 'IN',
          },
        });
      expect([200, 201]).toContain(ordRes.status);
      secondOrderId = ordRes.body.id;

      // Progress order to delivered
      await request(BASE_URL)
        .patch(`/admin/orders/${secondOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ toStatus: 'paid' });
      await request(BASE_URL)
        .patch(`/admin/orders/${secondOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ toStatus: 'processing' });
      await request(BASE_URL)
        .patch(`/admin/orders/${secondOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          toStatus: 'shipped',
          trackingUrl: 'https://delhivery.com/track/123',
        });
      await request(BASE_URL)
        .patch(`/admin/orders/${secondOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ toStatus: 'delivered' });
    });

    it('ADM-03: stores and renders HTML/script tags safely without SQL corruption or unescaped execution', async () => {
      const maliciousName = '<script>alert("XSS-Customer")</script> <b>Buyer</b>';
      const maliciousDescription = '<img src=x onerror=alert("XSS-Review")> <script>evil()</script> Outstanding dhoop!';

      // Submit review with script tags
      const res = await request(BASE_URL)
        .post('/reviews')
        .send({
          productId: reviewProductId,
          customerName: maliciousName,
          stars: 4,
          description: maliciousDescription,
          email: xssEmail,
          phone: xssPhone,
        });

      expect([200, 201]).toContain(res.status);
      xssReviewId = res.body.id;

      // Verify data is safely stored verbatim in database
      expect(res.body.customerName).toBe(maliciousName);
      expect(res.body.description).toBe(maliciousDescription);

      // Verify admin review list retrieves cleanly as JSON
      const adminList = await request(BASE_URL)
        .get(`/reviews?productId=${reviewProductId}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(adminList.status).toBe(200);
      const rev = adminList.body.find((r: any) => r.id === xssReviewId);
      expect(rev).toBeDefined();
      expect(rev.customerName).toBe(maliciousName);
      expect(rev.description).toBe(maliciousDescription);

      // Clean up XSS test review
      await request(BASE_URL)
        .delete(`/reviews/${xssReviewId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    });
  });
});
