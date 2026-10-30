import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'Y9thJkIcOkD90gh8jncph6zb';

function signWebhook(payload: any, secret: string = WEBHOOK_SECRET): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return { rawBody, signature };
}

describe('Layer 9: Razorpay Payment Gateway & Webhook Security (Live Server E2E)', () => {
  let adminToken: string;
  let editorToken: string;
  let categoryId: string;
  let testProductId: string;
  const createdProductIds: string[] = [];

  // Reusable order references for multi-step webhook lifecycles
  let orderPaidId: string;
  let orderPaidNumber: string;
  let orderPaidRzpOrderId: string;
  let paidCapturedEventId: string;
  let paidCapturedPaymentId: string;

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

    // Create an in-stock product (Rs. 500 -> free shipping threshold)
    const prodRes = await request(BASE_URL)
      .post('/admin/create-products')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Payment Gateway Test Product 500',
        slug: `pay-test-prod-${Date.now()}`,
        sku: `PAY-TEST-${Date.now()}`,
        basePrice: 500.0,
        stockQuantity: 100,
        categoryId,
        shippingTemplateId: null,
        status: 'active',
      });
    expect([200, 201]).toContain(prodRes.status);
    testProductId = prodRes.body.id;
    createdProductIds.push(testProductId);

    // Create primary test order for payment capture and refund lifecycle
    const ordRes = await request(BASE_URL)
      .post('/orders')
      .set('X-Forwarded-For', '10.20.1.1')
      .send({
        email: 'lifecycle.buyer@example.com',
        items: [{ productId: testProductId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Lifecycle Buyer',
          phone: '9876543210',
          addressLine1: 'Main Street 1',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
          country: 'IN',
        },
      });
    expect([200, 201]).toContain(ordRes.status);
    orderPaidId = ordRes.body.id;
    orderPaidNumber = ordRes.body.orderNumber;
    expect(Number(ordRes.body.grandTotal)).toBe(500);

    // Create session to generate razorpayOrderId
    const sessRes = await request(BASE_URL)
      .post('/payments/create-session')
      .send({ orderId: orderPaidId });
    expect([200, 201]).toContain(sessRes.status);
    orderPaidRzpOrderId = sessRes.body.razorpayOrderId;
    expect(orderPaidRzpOrderId).toBeDefined();
  });

  afterAll(async () => {
    for (const prodId of createdProductIds) {
      await request(BASE_URL)
        .delete(`/admin/delete-products/${prodId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    }
  });

  // ==========================================
  // PAY-01: Webhook HMAC Verification
  // ==========================================
  describe('PAY-01: Webhook HMAC Verification', () => {
    it('PAY-01.1: accepts valid HMAC signature matching raw body', async () => {
      const payload = {
        id: `evt_hmac_valid_${Date.now()}`,
        event: 'payout.processed',
      };
      const { rawBody, signature } = signWebhook(payload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);
      expect(res.body.status).toBe('processed');
    });

    it('PAY-01.2: rejects webhook when signature header is missing with 400 Bad Request', async () => {
      const payload = {
        id: `evt_hmac_missing_${Date.now()}`,
        event: 'payout.processed',
      };
      const rawBody = JSON.stringify(payload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        // x-razorpay-signature header omitted
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid webhook signature/i);
    });

    it('PAY-01.3: rejects webhook with forged / invalid signature with 400 Bad Request', async () => {
      const payload = {
        id: `evt_hmac_forged_${Date.now()}`,
        event: 'payout.processed',
      };
      const rawBody = JSON.stringify(payload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid webhook signature/i);
    });
  });

  // ==========================================
  // PAY-02: Currency & Amount Mismatch
  // ==========================================
  describe('PAY-02: Currency & Amount Mismatch Detection', () => {
    it('PAY-02.1: rejects webhook when payment amount does not match order grand total (400 Bad Request)', async () => {
      const mismatchedAmountPayload = {
        id: `evt_mismatch_amt_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_amt_mismatch_${Date.now()}`,
              order_id: orderPaidRzpOrderId,
              amount: 10000, // 10000 paise (Rs 100) vs actual order grandTotal Rs 500 (50000 paise)
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(mismatchedAmountPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Payment amount mismatch/i);

      // Verify order remains payment_pending
      const checkOrder = await request(BASE_URL)
        .get(`/admin/orders/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkOrder.body.status).toBe('payment_pending');
    });

    it('PAY-02.2: rejects webhook when payment currency does not match order currency (400 Bad Request)', async () => {
      const mismatchedCurrencyPayload = {
        id: `evt_mismatch_curr_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_curr_mismatch_${Date.now()}`,
              order_id: orderPaidRzpOrderId,
              amount: 50000,
              currency: 'USD', // USD vs INR
              status: 'captured',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(mismatchedCurrencyPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Payment currency mismatch/i);

      // Verify order remains payment_pending
      const checkOrder = await request(BASE_URL)
        .get(`/admin/orders/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkOrder.body.status).toBe('payment_pending');
    });
  });

  // ==========================================
  // PAY-03: Status Transition to paid
  // ==========================================
  describe('PAY-03: Status Transition to paid', () => {
    it('PAY-03: valid payment.captured webhook transitions order from payment_pending to paid', async () => {
      paidCapturedEventId = `evt_cap_paid_${Date.now()}`;
      paidCapturedPaymentId = `pay_cap_paid_${Date.now()}`;

      const capturedPayload = {
        id: paidCapturedEventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paidCapturedPaymentId,
              order_id: orderPaidRzpOrderId,
              amount: 50000, // Rs 500 in paise
              currency: 'INR',
              status: 'captured',
              method: 'upi',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(capturedPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);
      expect(res.body.status).toBe('processed');

      // Verify order in database transitioned to paid
      const orderCheck = await request(BASE_URL)
        .get(`/admin/orders/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(orderCheck.body.status).toBe('paid');
      expect(orderCheck.body.placedAt).toBeDefined();

      // Verify OrderStatusHistory
      const history = orderCheck.body.statusHistory;
      expect(history.length).toBeGreaterThan(0);
      const paidHistory = history.find((h: any) => h.toStatus === 'paid');
      expect(paidHistory).toBeDefined();
      expect(paidHistory.changedBySystem).toBe('Razorpay Webhook');

      // Verify payment record
      const pmtRes = await request(BASE_URL)
        .get(`/admin/payments/order/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pmtRes.body.status).toBe('CAPTURED');
      expect(pmtRes.body.razorpayPaymentId).toBe(paidCapturedPaymentId);
    });
  });

  // ==========================================
  // PAY-04: Payment Failed Handling
  // ==========================================
  describe('PAY-04: Payment Failed Handling', () => {
    it('PAY-04: payment.failed webhook transitions payment_pending order to cancelled', async () => {
      // 1. Create separate order for failure testing
      const ordRes = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.20.1.2')
        .send({
          email: 'fail.buyer@example.com',
          items: [{ productId: testProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Fail Buyer',
            phone: '9876543210',
            addressLine1: 'Fail Road',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500081',
            country: 'IN',
          },
        });
      expect([200, 201]).toContain(ordRes.status);
      const failOrderId = ordRes.body.id;

      const sessRes = await request(BASE_URL)
        .post('/payments/create-session')
        .send({ orderId: failOrderId });
      const failRzpOrderId = sessRes.body.razorpayOrderId;

      // 2. Send payment.failed webhook
      const failedPayload = {
        id: `evt_failed_${Date.now()}`,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: `pay_failed_${Date.now()}`,
              order_id: failRzpOrderId,
              status: 'failed',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(failedPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);

      // Verify order transitioned to cancelled
      const orderCheck = await request(BASE_URL)
        .get(`/admin/orders/${failOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(orderCheck.body.status).toBe('cancelled');

      // Verify payment record updated to FAILED
      const pmtRes = await request(BASE_URL)
        .get(`/admin/payments/order/${failOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pmtRes.body.status).toBe('FAILED');
    });
  });

  // ==========================================
  // PAY-05: No Downgrade of Paid Order
  // ==========================================
  describe('PAY-05: No Downgrade of Paid Order', () => {
    it('PAY-05: late payment.failed webhook arriving after order is paid does NOT downgrade order to cancelled', async () => {
      // Send payment.failed for orderPaidId (which is already in status 'paid')
      const lateFailedPayload = {
        id: `evt_late_failed_${Date.now()}`,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: `pay_late_fail_${Date.now()}`,
              order_id: orderPaidRzpOrderId,
              status: 'failed',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(lateFailedPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);

      // Verify order is STILL 'paid'
      const orderCheck = await request(BASE_URL)
        .get(`/admin/orders/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(orderCheck.body.status).toBe('paid');

      // Verify payment record is STILL 'CAPTURED'
      const pmtRes = await request(BASE_URL)
        .get(`/admin/payments/order/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pmtRes.body.status).toBe('CAPTURED');
    });
  });

  // ==========================================
  // PAY-06: Duplicate Webhook Idempotency
  // ==========================================
  describe('PAY-06: Duplicate Webhook Idempotency', () => {
    it('PAY-06: duplicate delivery of identical event ID returns already_processed without duplicate history', async () => {
      // Fetch initial history count
      const initialOrder = await request(BASE_URL)
        .get(`/admin/orders/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const initialHistoryCount = initialOrder.body.statusHistory.length;

      // Resend exact same payload as PAY-03 (same paidCapturedEventId)
      const duplicatePayload = {
        id: paidCapturedEventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paidCapturedPaymentId,
              order_id: orderPaidRzpOrderId,
              amount: 50000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(duplicatePayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);
      expect(res.body.status).toBe('already_processed');
      expect(res.body.eventId).toBe(paidCapturedEventId);

      // Verify status history count did not increment
      const afterOrder = await request(BASE_URL)
        .get(`/admin/orders/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(afterOrder.body.statusHistory.length).toBe(initialHistoryCount);
    });
  });

  // ==========================================
  // PAY-07: Unknown Order / Event Resilience
  // ==========================================
  describe('PAY-07: Unknown Order / Event Resilience', () => {
    it('PAY-07.1: gracefully handles payment.captured for unknown / non-existent order ID without crashing', async () => {
      const unknownOrderPayload = {
        id: `evt_unknown_ord_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_unknown_${Date.now()}`,
              order_id: 'order_non_existent_99999',
              amount: 50000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(unknownOrderPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);
    });

    it('PAY-07.2: gracefully acknowledges unsupported / unknown event types', async () => {
      const unknownEventPayload = {
        id: `evt_unknown_type_${Date.now()}`,
        event: 'virtual_account.credited',
        payload: {},
      };
      const { rawBody, signature } = signWebhook(unknownEventPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);
      expect(res.body.status).toBe('processed');
    });
  });

  // ==========================================
  // PAY-08: Captured Payment on Cancelled Order
  // ==========================================
  describe('PAY-08: Captured Payment on Cancelled Order', () => {
    it('PAY-08: leaves order cancelled, sets payment CAPTURED, and logs critical staff warning note', async () => {
      // 1. Create order
      const ordRes = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.20.1.3')
        .send({
          email: 'cancel.capture@example.com',
          items: [{ productId: testProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Cancel Capture User',
            phone: '9876543210',
            addressLine1: 'Cancel Capture Lane',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500081',
            country: 'IN',
          },
        });
      expect([200, 201]).toContain(ordRes.status);
      const cancelledOrderId = ordRes.body.id;

      const sessRes = await request(BASE_URL)
        .post('/payments/create-session')
        .send({ orderId: cancelledOrderId });
      const cancelledRzpOrderId = sessRes.body.razorpayOrderId;

      // 2. Staff cancels the order prior to payment capture
      const cancelRes = await request(BASE_URL)
        .patch(`/admin/orders/${cancelledOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          toStatus: 'cancelled',
          note: 'Cancelled by customer support before payment received',
        });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('cancelled');

      // 3. Late payment.captured webhook arrives for the cancelled order
      const capturedOnCancelledPayload = {
        id: `evt_cap_on_cancel_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_cap_on_cancel_${Date.now()}`,
              order_id: cancelledRzpOrderId,
              amount: 50000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(capturedOnCancelledPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);

      // 4. Verify order remains 'cancelled'
      const orderCheck = await request(BASE_URL)
        .get(`/admin/orders/${cancelledOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(orderCheck.body.status).toBe('cancelled');

      // Verify payment status is CAPTURED
      const pmtRes = await request(BASE_URL)
        .get(`/admin/payments/order/${cancelledOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pmtRes.body.status).toBe('CAPTURED');

      // Verify critical staff alert in OrderStatusHistory
      const alertHistory = orderCheck.body.statusHistory.find((h: any) =>
        h.note?.includes('ALERT: Payment'),
      );
      expect(alertHistory).toBeDefined();
      expect(alertHistory.note).toMatch(/captured after order was already cancelled.*Manual refund or staff intervention required/i);
    });
  });

  // ==========================================
  // PAY-09: Notification Timing
  // ==========================================
  describe('PAY-09: Notification Timing', () => {
    it('PAY-09: order_confirmation is sent ONLY after payment status is paid, never during payment_pending', async () => {
      // 1. Create a fresh order in payment_pending
      const pendingRes = await request(BASE_URL)
        .post('/orders')
        .set('X-Forwarded-For', '10.20.1.4')
        .send({
          email: 'timing.buyer@example.com',
          items: [{ productId: testProductId, quantity: 1 }],
          shippingAddress: {
            fullName: 'Timing Buyer',
            phone: '9876543210',
            addressLine1: 'Timing St',
            city: 'Hyderabad',
            state: 'Telangana',
            postalCode: '500081',
            country: 'IN',
          },
        });
      expect([200, 201]).toContain(pendingRes.status);
      const pendingOrderNumber = pendingRes.body.orderNumber;

      // 2. Query email logs: verify NO order_confirmation exists for this pending order
      const pendingLogs = await request(BASE_URL)
        .get(`/admin/email/logs?search=${pendingOrderNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pendingLogs.status).toBe(200);
      const pendingConf = pendingLogs.body.data.find(
        (l: any) => l.templateKey === 'order_confirmation',
      );
      expect(pendingConf).toBeUndefined();

      // 3. Verify that for orderPaidNumber (which was paid in PAY-03), order_confirmation WAS dispatched
      const paidLogs = await request(BASE_URL)
        .get(`/admin/email/logs?search=${orderPaidNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(paidLogs.status).toBe(200);
      const paidConf = paidLogs.body.data.find(
        (l: any) => l.templateKey === 'order_confirmation',
      );
      expect(paidConf).toBeDefined();
      expect(paidConf.orderNumber).toBe(orderPaidNumber);
    });
  });

  // ==========================================
  // PAY-10: Full Refund Transition
  // ==========================================
  describe('PAY-10: Full Refund Transition', () => {
    it('PAY-10: refund.processed webhook transitions order to refunded and logs refund notification', async () => {
      const refundId = `rfnd_full_${Date.now()}`;
      const refundPayload = {
        id: `evt_refund_${Date.now()}`,
        event: 'refund.processed',
        payload: {
          payment: {
            entity: {
              id: paidCapturedPaymentId,
              order_id: orderPaidRzpOrderId,
            },
          },
          refund: {
            entity: {
              id: refundId,
              payment_id: paidCapturedPaymentId,
              amount: 50000, // 50000 paise (full Rs 500)
              currency: 'INR',
              status: 'processed',
            },
          },
        },
      };
      const { rawBody, signature } = signWebhook(refundPayload);

      const res = await request(BASE_URL)
        .post('/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(rawBody);

      expect([200, 201]).toContain(res.status);
      expect(res.body.received).toBe(true);

      // Verify order transitioned to refunded
      const orderCheck = await request(BASE_URL)
        .get(`/admin/orders/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(orderCheck.body.status).toBe('refunded');

      // Verify payment status is REFUNDED
      const pmtRes = await request(BASE_URL)
        .get(`/admin/payments/order/${orderPaidId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pmtRes.body.status).toBe('REFUNDED');

      // Verify status history contains refund entry
      const refHistory = orderCheck.body.statusHistory.find((h: any) => h.toStatus === 'refunded');
      expect(refHistory).toBeDefined();
      expect(refHistory.changedBySystem).toBe('Razorpay Webhook Refund');

      // Verify refund_processed notification was logged
      const refundLogs = await request(BASE_URL)
        .get(`/admin/email/logs?search=${orderPaidNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(refundLogs.status).toBe(200);
      const refNotif = refundLogs.body.data.find((l: any) => l.templateKey === 'refund_processed');
      expect(refNotif).toBeDefined();
    });
  });
});
