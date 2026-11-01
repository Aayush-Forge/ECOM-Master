import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = 'Y9thJkIcOkD90gh8jncph6zb';

async function testWebhookSignatures() {
  const adminLogin = await fetch('http://localhost:5000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sridattam.com', password: 'password123' })
  }).then(r => r.json());

  // 1. Get real product and create an order
  const prod = await fetch('http://localhost:5000/products?page=1&per_page=1').then(r => r.json());
  const p = prod.products?.[0] || prod.data?.[0] || prod[0];

  const order = await fetch('http://localhost:5000/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'webhook_sig_test@sridattam.com',
      shippingAddress: { fullName: 'Sig Tester', phone: '9876543210', addressLine1: '123 Test', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'India' },
      billingAddress: { fullName: 'Sig Tester', phone: '9876543210', addressLine1: '123 Test', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'India' },
      items: [{ productId: p.id, quantity: 1 }]
    })
  }).then(r => r.json());

  const session = await fetch('http://localhost:5000/payments/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id })
  }).then(r => r.json());

  const eventId = 'evt_' + Date.now();
  const paymentId = 'pay_' + Date.now();
  const payload = {
    entity: 'event',
    account_id: 'acc_123',
    event: 'payment.captured',
    id: eventId,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: session.razorpayOrderId,
          amount: Math.round(Number(order.grandTotal) * 100),
          currency: 'INR',
          status: 'captured'
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  };
  const rawBody = JSON.stringify(payload);

  // 1. Missing signature
  const res1 = await fetch('http://localhost:5000/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody
  });
  console.log('1. Missing signature status:', res1.status);

  // 2. Invalid signature
  const res2 = await fetch('http://localhost:5000/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'invalid_sig' },
    body: rawBody
  });
  console.log('2. Invalid signature status:', res2.status);

  // 3. Valid signature
  const validSig = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(rawBody).digest('hex');
  const res3 = await fetch('http://localhost:5000/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': validSig },
    body: rawBody
  });
  console.log('3. Valid signature status:', res3.status, await res3.json());

  // Check order status
  const updatedOrder = await fetch('http://localhost:5000/admin/orders/' + order.id, {
    headers: { Authorization: 'Bearer ' + adminLogin.access_token }
  }).then(r => r.json());
  console.log('Order status after valid webhook:', updatedOrder.status);

  // 4. Duplicate replay
  const res4 = await fetch('http://localhost:5000/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': validSig },
    body: rawBody
  });
  console.log('4. Duplicate replay status:', res4.status, await res4.json());
}

testWebhookSignatures().catch(console.error);
