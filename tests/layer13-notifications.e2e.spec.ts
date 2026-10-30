import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  renderEmailTemplate,
  applyWordingPlaceholders,
  formatINR,
  escapeHtml,
} from './templates/email-templates';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'Y9thJkIcOkD90gh8jncph6zb';

function signWebhook(payload: any, secret: string = WEBHOOK_SECRET): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return { rawBody, signature };
}

describe('Layer 13: Transactional Notifications & Fail-Open (Live Server E2E)', () => {
  let adminToken: string;
  let editorToken: string;
  let readOnlyToken: string;
  let categoryId: string;
  let notifProductId: string;
  let failOpenOrderId: string;
  let failOpenOrderNumber: string;
  let failOpenLogId: string;
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

    // Create in-stock product (Rs. 499)
    const prodRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Fail-Open Incense Product',
        slug: `fail-open-incense-${Date.now()}`,
        sku: `FAIL-OPEN-${Date.now()}`,
        basePrice: 499.0,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(prodRes.status);
    notifProductId = prodRes.body.id;
    createdProductIds.push(notifProductId);

    // Place an order for fail-open verification
    const ordRes = await request(BASE_URL)
      .post('/orders')
      .set('X-Forwarded-For', '10.50.1.1')
      .send({
        email: 'failopen.buyer@example.com',
        items: [{ productId: notifProductId, quantity: 1 }],
        shippingAddress: {
          fullName: 'FailOpen Buyer',
          phone: '9876543210',
          addressLine1: 'Resilience Avenue 101',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
          country: 'IN',
        },
      });
    expect([200, 201]).toContain(ordRes.status);
    failOpenOrderId = ordRes.body.id;
    failOpenOrderNumber = ordRes.body.orderNumber;
  });

  afterAll(async () => {
    for (const prodId of createdProductIds) {
      await request(BASE_URL)
        .delete(`/admin/delete-products/${prodId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
  });

  // ==========================================
  // NOTIF-01: Variable Interpolation
  // ==========================================
  describe('NOTIF-01: Template Variable Interpolation', () => {
    const mockOrder = {
      id: 'mock-order-uuid-1234',
      orderNumber: 'SDO9876',
      grandTotal: 499.0,
      currency: 'INR',
      trackingUrl: 'https://speedpost.indiapost.gov.in/track/SP123456IN',
      trackingNumber: 'SP123456IN',
      customer: {
        firstName: 'Ananya',
        lastName: 'Iyer',
        email: 'ananya@example.com',
      },
      addresses: [
        {
          type: 'shipping',
          fullName: 'Ananya Iyer',
          addressLine1: '77 Lotus Temple Rd',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
        },
      ],
      items: [
        {
          id: 'item-1',
          titleSnapshot: 'Pure Sandalwood Dhoop',
          skuSnapshot: 'DHP-SAN-01',
          quantity: 1,
          unitPriceSnapshot: 499.0,
          lineTotal: 499.0,
        },
      ],
    };

    it('NOTIF-01.1: interpolates orderNumber, customerName, and brandName in wording', () => {
      const template = 'Hello {{customerName}}, your order #{{orderNumber}} from {{brandName}} is confirmed!';
      const result = applyWordingPlaceholders(template, mockOrder);
      expect(result).toBe('Hello Ananya Iyer, your order #SDO9876 from Sridattam is confirmed!');
      expect(result).not.toContain('{{customerName}}');
      expect(result).not.toContain('{{orderNumber}}');
      expect(result).not.toContain('{{brandName}}');
    });

    it('NOTIF-01.2: renders order_confirmation template with order number and currency formatting', () => {
      const rendered = renderEmailTemplate('order_confirmation', mockOrder);
      expect(rendered.subject).toContain('#SDO9876');
      expect(rendered.html).toContain('SDO9876');
      expect(rendered.html).toContain('Ananya Iyer');
      expect(rendered.html).toContain('Pure Sandalwood Dhoop');
      expect(rendered.html).toContain('₹499.00');
    });

    it('NOTIF-01.3: renders status_shipped template with tracking URL and tracking number', () => {
      const rendered = renderEmailTemplate('status_shipped', mockOrder);
      expect(rendered.subject).toContain('#SDO9876');
      expect(rendered.html).toContain('https://speedpost.indiapost.gov.in/track/SP123456IN');
      expect(rendered.html).toContain('SP123456IN');
    });

    it('NOTIF-01.4: renders refund_processed template with exact formatted refund amount', () => {
      const rendered = renderEmailTemplate('refund_processed', mockOrder);
      expect(rendered.subject).toContain('#SDO9876');
      expect(rendered.html).toContain('SDO9876');
      expect(rendered.html).toContain('₹499.00');
    });

    it('NOTIF-01.5: sanitizes malicious script inputs in email templates via escapeHtml', () => {
      const maliciousOrder = {
        ...mockOrder,
        addresses: [{ fullName: '<script>alert("xss")</script> Buyer' }],
      };
      const rendered = renderEmailTemplate('order_confirmation', maliciousOrder);
      expect(rendered.html).not.toContain('<script>');
      expect(rendered.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; Buyer');
    });
  });

  // ==========================================
  // NOTIF-02: Mail Server Fail-Open Architecture
  // ==========================================
  describe('NOTIF-02: Mail Server Fail-Open Architecture', () => {
    it('NOTIF-02: payment capture and checkout succeed without disruption during SMTP outage; logs status "failed"', async () => {
      // 1. Create payment session
      const sessRes = await request(BASE_URL)
        .post('/payments/create-session')
        .send({ orderId: failOpenOrderId });
      expect([200, 201]).toContain(sessRes.status);
      const rzpOrderId = sessRes.body.razorpayOrderId;

      // 2. Deliver payment.captured webhook (triggers order.paid event -> triggers email dispatch)
      const capturedPayload = {
        id: `evt_failopen_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_failopen_${Date.now()}`,
              order_id: rzpOrderId,
              amount: 49900,
              currency: 'INR',
              status: 'captured',
              method: 'netbanking',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(capturedPayload);

      // Even though SMTP port 1025 is offline, webhook MUST complete successfully (fail-open)
      const hookRes = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);
      expect([200, 201]).toContain(hookRes.status);
      expect(hookRes.body.received).toBe(true);

      // Order must be successfully transitioned to 'paid' (not blocked or rolled back)
      const orderCheck = await request(BASE_URL)
        .get(`/admin/orders/${failOpenOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(orderCheck.body.status).toBe('paid');

      // 3. Verify notification_log records failure gracefully without breaking checkout (poll async BullMQ worker)
      let customerConfLog: any = null;
      for (let attempt = 0; attempt < 15; attempt++) {
        const logsRes = await request(BASE_URL)
          .get(`/admin/email/logs?search=${failOpenOrderNumber}`)
          .set('Authorization', `Bearer ${adminToken}`);
        if (logsRes.status === 200 && Array.isArray(logsRes.body?.data)) {
          customerConfLog = logsRes.body.data.find(
            (l: any) => l.templateKey === 'order_confirmation',
          );
          if (customerConfLog) break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      expect(customerConfLog).toBeDefined();
      expect(customerConfLog.status).toBe('failed');
      expect(customerConfLog.recipient).toBe('failopen.buyer@example.com');
      expect(customerConfLog.error).toBeDefined();
      expect(customerConfLog.error).toMatch(/ECONNREFUSED/i);

      failOpenLogId = customerConfLog.id;
    });
  });

  // ==========================================
  // NOTIF-03: Admin Retry Trigger & RBAC
  // ==========================================
  describe('NOTIF-03: Admin Notification Retry Trigger', () => {
    it('NOTIF-03.1: restricts retry endpoint to ADMIN role (blocks anonymous, editor, and read_only)', async () => {
      // Anonymous
      const anonRes = await request(BASE_URL).post(`/admin/email/logs/${failOpenLogId}/retry`);
      expect(anonRes.status).toBe(401);

      // Editor (403 Forbidden)
      const editRes = await request(BASE_URL)
        .post(`/admin/email/logs/${failOpenLogId}/retry`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(editRes.status).toBe(403);

      // Read-only (403 Forbidden)
      const roRes = await request(BASE_URL)
        .post(`/admin/email/logs/${failOpenLogId}/retry`)
        .set('Authorization', `Bearer ${readOnlyToken}`);
      expect(roRes.status).toBe(403);
    });

    it('NOTIF-03.2: returns 404 Not Found when attempting to retry non-existent notification ID', async () => {
      const res = await request(BASE_URL)
        .post('/admin/email/logs/00000000-0000-0000-0000-000000000000/retry')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('NOTIF-03.3: admin retry attempt re-triggers dispatch, records updated error, and creates audit log entry', async () => {
      const retryRes = await request(BASE_URL)
        .post(`/admin/email/logs/${failOpenLogId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Since SMTP is offline, retry service attempts send, catches the failure, updates log, and throws 400 with details
      expect(retryRes.status).toBe(400);
      expect(retryRes.body.message).toMatch(/Email retry failed: connect ECONNREFUSED/i);

      // Verify AuditLog captures the retry attempt
      const auditRes = await request(BASE_URL)
        .get(`/audit-logs?entityType=notification_log`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auditRes.status).toBe(200);

      const retryAudit = auditRes.body.find(
        (a: any) => a.entityId === failOpenLogId && a.actionType.includes('notification.retry'),
      );
      expect(retryAudit).toBeDefined();
      expect(retryAudit.actionType).toBe('notification.retry_failed');
      expect(retryAudit.userRole).toBe('admin');
    });
  });
});
