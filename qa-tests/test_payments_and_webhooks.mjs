import crypto from 'crypto';

const BACKEND_URL = 'http://localhost:5000';
const RAZORPAY_KEY_SECRET = 'Y9thJkIcOkD90gh8jncph6zb';

async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

async function runPaymentsAndWebhookTests() {
  console.log('--- RUNNING PAYMENTS, WEBHOOKS & RETRY TESTS ---');
  const customer = await login('customer@sridattam.com', 'password123');

  const findings = [];

  // 1. Create a real test order
  const prodRes = await fetch(`${BACKEND_URL}/products?page=1&per_page=1`);
  const prodData = await prodRes.json();
  const product = prodData.products?.[0] || prodData.data?.[0];

  const orderRes = await fetch(`${BACKEND_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customer.token}`,
    },
    body: JSON.stringify({
      email: 'payment_test@sridattam.com',
      shippingAddress: {
        fullName: 'Payment Tester',
        phone: '9876543210',
        addressLine1: '123 Pay St',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      billingAddress: {
        fullName: 'Payment Tester',
        phone: '9876543210',
        addressLine1: '123 Pay St',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  const order = await orderRes.json();
  console.log('Created order for payment tests:', order.id, 'GrandTotal:', order.grandTotal);

  // 2. CREATE PAYMENT SESSION
  console.log('\n[TEST 1] Create Payment Session');
  const sessionRes = await fetch(`${BACKEND_URL}/payments/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id }),
  });
  const session = await sessionRes.json();
  console.log('Create session response:', sessionRes.status, session);

  if (!sessionRes.ok || !session.razorpayOrderId) {
    findings.push({
      id: 'PAYMENT-SESSION-FAIL',
      severity: 'Critical',
      area: 'Payments',
      title: 'Payment Session Creation Failed',
      evidence: `POST /payments/create-session returned ${sessionRes.status}: ${JSON.stringify(session)}`,
    });
  }

  // Session idempotency check: calling create-session again should return the same razorpayOrderId
  const session2Res = await fetch(`${BACKEND_URL}/payments/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id }),
  });
  const session2 = await session2Res.json();
  console.log('Session 2 razorpayOrderId:', session2.razorpayOrderId, 'Matches original:', session2.razorpayOrderId === session.razorpayOrderId);
  if (session2.razorpayOrderId !== session.razorpayOrderId) {
    findings.push({
      id: 'PAYMENT-SESSION-NON-IDEMPOTENT',
      severity: 'High',
      area: 'Payments',
      title: 'Payment Session Creation Not Idempotent',
      evidence: `Second call to /payments/create-session returned different razorpayOrderId: ${session2.razorpayOrderId}`,
    });
  }

  // 3. PAYMENT FAILURE & RETRY TRACKING (recordPaymentFailure)
  console.log('\n[TEST 2] Record Payment Failure and Customer Retry Support');
  const failRes = await fetch(`${BACKEND_URL}/payments/fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      razorpayOrderId: session.razorpayOrderId,
      razorpayPaymentId: 'pay_fail_123',
      errorCode: 'BAD_REQUEST_ERROR',
      errorDescription: 'Card declined by bank',
      source: 'bank',
      step: 'payment_authentication',
      reason: 'payment_failed',
    }),
  });
  const failData = await failRes.json();
  console.log('Record failure status:', failRes.status, failData);
  if (!failRes.ok || !failData.canRetry) {
    findings.push({
      id: 'PAYMENT-FAILURE-RECORDING-FAIL',
      severity: 'High',
      area: 'Payments',
      title: 'Payment failure tracking failed or did not permit retry',
      evidence: `POST /payments/fail returned ${failRes.status}: ${JSON.stringify(failData)}`,
    });
  }

  // 4. VERIFY PAYMENT WITH FORGED HMAC SIGNATURE
  console.log('\n[TEST 3] Verify Payment with Invalid HMAC Signature');
  const fakeSigRes = await fetch(`${BACKEND_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      razorpayOrderId: session.razorpayOrderId,
      razorpayPaymentId: 'pay_fake_99999',
      razorpaySignature: 'invalid_forged_hmac_sha256_signature_xxxxxxxx',
    }),
  });
  console.log('Forged signature verification response status:', fakeSigRes.status);
  const fakeSigText = await fakeSigRes.text();
  if (fakeSigRes.ok) {
    findings.push({
      id: 'PAYMENT-HMAC-BYPASS',
      severity: 'Critical',
      area: 'Payments',
      title: 'Cryptographic Bypass: Invalid Razorpay HMAC signature accepted as valid payment!',
      evidence: `POST /payments/verify returned HTTP 200 for invalid signature: ${fakeSigText}`,
    });
  } else {
    console.log('PASS: Invalid HMAC signature was rejected.');
  }

  // 5. VERIFY PAYMENT WITH VALID HMAC SIGNATURE
  console.log('\n[TEST 4] Verify Payment with Cryptographically Valid HMAC Signature');
  const realPaymentId = `pay_valid_${Date.now()}`;
  const hmacData = `${session.razorpayOrderId}|${realPaymentId}`;
  const validSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(hmacData).digest('hex');

  const validSigRes = await fetch(`${BACKEND_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      razorpayOrderId: session.razorpayOrderId,
      razorpayPaymentId: realPaymentId,
      razorpaySignature: validSignature,
    }),
  });
  const validSigData = await validSigRes.json();
  console.log('Valid signature verification status:', validSigRes.status, validSigData);

  if (!validSigRes.ok) {
    findings.push({
      id: 'VALID-PAYMENT-REJECTED',
      severity: 'Critical',
      area: 'Payments',
      title: 'Valid payment signature rejected',
      evidence: `POST /payments/verify returned ${validSigRes.status}: ${JSON.stringify(validSigData)}`,
    });
  }

  // Replay verification check (double processing)
  console.log('\n[TEST 5] Payment Verification Replay (Double Processing Prevention)');
  const replayRes = await fetch(`${BACKEND_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      razorpayOrderId: session.razorpayOrderId,
      razorpayPaymentId: realPaymentId,
      razorpaySignature: validSignature,
    }),
  });
  console.log('Payment replay status:', replayRes.status);

  // 6. RAZORPAY WEBHOOK TESTS
  console.log('\n[TEST 6] Razorpay Webhook Event Ingestion');
  // Create another order for webhook test
  const wbOrderRes = await fetch(`${BACKEND_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customer.token}`,
    },
    body: JSON.stringify({
      email: 'webhook_test@sridattam.com',
      shippingAddress: {
        fullName: 'Webhook Tester',
        phone: '9876543210',
        addressLine1: '123 Webhook St',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'India',
      },
      billingAddress: {
        fullName: 'Webhook Tester',
        phone: '9876543210',
        addressLine1: '123 Webhook St',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'India',
      },
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  const wbOrder = await wbOrderRes.json();
  const wbSessionRes = await fetch(`${BACKEND_URL}/payments/create-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: wbOrder.id }),
  });
  const wbSession = await wbSessionRes.json();

  const webhookEventId = `evt_test_${Date.now()}`;
  const webhookPaymentId = `pay_wb_${Date.now()}`;
  const webhookPayload = {
    entity: 'event',
    account_id: 'acc_test123',
    event: 'payment.captured',
    contains: ['payment'],
    id: webhookEventId,
    payload: {
      payment: {
        entity: {
          id: webhookPaymentId,
          order_id: wbSession.razorpayOrderId,
          amount: Math.round(Number(wbOrder.grandTotal) * 100),
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          email: 'webhook_test@sridattam.com',
          contact: '+919876543210',
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
  const rawWebhookBody = JSON.stringify(webhookPayload);

  // Send webhook
  const wbRes = await fetch(`${BACKEND_URL}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: rawWebhookBody,
  });
  console.log('Webhook POST status:', wbRes.status);
  const wbResult = await wbRes.json();
  console.log('Webhook response:', wbResult);

  // Duplicate webhook replay test
  console.log('Testing duplicate webhook idempotency...');
  const dupWbRes = await fetch(`${BACKEND_URL}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: rawWebhookBody,
  });
  const dupResult = await dupWbRes.json();
  console.log('Duplicate webhook status:', dupWbRes.status, dupResult);
  if (dupResult.status !== 'already_processed') {
    findings.push({
      id: 'WEBHOOK-DUPLICATE-NOT-DEDUPLICATED',
      severity: 'Medium',
      area: 'Payments / Webhooks',
      title: 'Webhook duplicate event not reported as already_processed',
      evidence: `Second delivery of event ${webhookEventId} returned ${JSON.stringify(dupResult)}`,
    });
  }

  // Check order status after webhook
  const admin = await login('admin@sridattam.com', 'password123');
  const updatedWbOrderRes = await fetch(`${BACKEND_URL}/admin/orders/${wbOrder.id}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const updatedWbOrder = await updatedWbOrderRes.json();
  console.log('Order status after webhook:', updatedWbOrder.status);
  if (updatedWbOrder.status !== 'paid') {
    findings.push({
      id: 'WEBHOOK-STATUS-UPDATE-FAIL',
      severity: 'Critical',
      area: 'Payments / Webhooks',
      title: 'Webhook processing failed to transition order to paid status',
      evidence: `Order status is "${updatedWbOrder.status}", expected "paid"`,
    });
  }

  // 7. SENSITIVE / RAW CARD DATA SCAN IN DB
  console.log('\n[TEST 7] Scan Payments Table for Raw Card / PCI Credentials');
  const paymentsListRes = await fetch(`${BACKEND_URL}/admin/payments?page=1&per_page=10`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const paymentsListText = await paymentsListRes.text();
  if (/card[_\s]?number|cvv|expiry|pan/i.test(paymentsListText)) {
    findings.push({
      id: 'PCI-DSS-RAW-CARD-DATA-LEAK',
      severity: 'Critical',
      area: 'Payments / PCI-DSS',
      title: 'Potential PCI-DSS Violation: Payment response contains card number or CVV references',
      evidence: `GET /admin/payments matched card data pattern: ${paymentsListText.slice(0, 300)}`,
    });
  } else {
    console.log('PASS: No raw card or PAN data returned in payment records.');
  }

  console.log('\n=== PAYMENTS & WEBHOOKS FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
}

runPaymentsAndWebhookTests().catch(console.error);
