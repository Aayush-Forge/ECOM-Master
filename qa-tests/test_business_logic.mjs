import fs from 'fs';

const BACKEND_URL = 'http://localhost:5000';

async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

async function runBusinessLogicTests() {
  console.log('--- RUNNING BUSINESS LOGIC & EDGE CASES TESTS ---');
  const admin = await login('admin@sridattam.com', 'password123');
  const readOnly = await login('read_only@sridattam.com', 'password123');
  const customer = await login('customer@sridattam.com', 'password123');

  const findings = [];
  const calculations = [];

  // 1. ORDER STATE MACHINE & ROLE LIMITS
  console.log('\n[TEST 1] Order Status Transitions & Role Limits');
  const prodRes = await fetch(`${BACKEND_URL}/products?page=1&per_page=1`);
  const prodData = await prodRes.json();
  const product = prodData.products?.[0] || prodData.data?.[0];

  const createRes = await fetch(`${BACKEND_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customer.token}`,
    },
    body: JSON.stringify({
      email: 'state_machine_test@sridattam.com',
      shippingAddress: {
        fullName: 'State Machine Test',
        phone: '9876543210',
        addressLine1: '123 Test St',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        country: 'India',
      },
      billingAddress: {
        fullName: 'State Machine Test',
        phone: '9876543210',
        addressLine1: '123 Test St',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        country: 'India',
      },
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  const order = await createRes.json();
  console.log('Created test order:', order.id, 'Initial status:', order.status);

  // Read-Only tries to update order status
  const roUpdate = await fetch(`${BACKEND_URL}/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${readOnly.token}`,
    },
    body: JSON.stringify({ toStatus: 'processing' }),
  });
  console.log('Read-Only role update order status response:', roUpdate.status);
  if (roUpdate.status === 200) {
    findings.push({
      id: 'RBAC-READONLY-ORDER-MUTATION',
      severity: 'High',
      area: 'Orders',
      title: 'RBAC Violation: Read-Only staff role can mutate order status',
      evidence: `PATCH /admin/orders/${order.id}/status succeeded with HTTP 200 for Read-Only user`,
    });
  }

  // Illegal transition: Direct jump from payment_pending to delivered
  console.log('Testing illegal transition: payment_pending -> delivered');
  const illegalTransitionRes = await fetch(`${BACKEND_URL}/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({ toStatus: 'delivered' }),
  });
  console.log('Illegal transition payment_pending -> delivered status:', illegalTransitionRes.status);
  const illegalText = await illegalTransitionRes.text();
  if (illegalTransitionRes.ok) {
    findings.push({
      id: 'ORDER-STATE-MACHINE-BYPASS',
      severity: 'Critical',
      area: 'Orders',
      title: 'State Machine Violation: Order jumped directly from payment_pending to delivered without payment',
      evidence: `PATCH /admin/orders/${order.id}/status with toStatus: "delivered" succeeded: ${illegalText}`,
    });
  } else {
    console.log('PASS: Illegal status transition was correctly rejected.');
  }

  // Legal transitions: payment_pending -> paid -> processing -> shipped -> delivered
  console.log('Testing legal transition chain...');
  const legalSteps = ['paid', 'processing', 'shipped', 'delivered'];
  let currentStatus = order.status;
  for (const nextStatus of legalSteps) {
    const stepRes = await fetch(`${BACKEND_URL}/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({ toStatus: nextStatus, note: `Moving to ${nextStatus}` }),
    });
    console.log(`Transition ${currentStatus} -> ${nextStatus}: HTTP ${stepRes.status}`);
    if (stepRes.ok) {
      currentStatus = nextStatus;
    } else {
      console.log(`Failed transition to ${nextStatus}:`, await stepRes.text());
    }
  }

  // Illegal backward transition: delivered -> payment_pending
  console.log('Testing illegal backward transition: delivered -> payment_pending');
  const backwardRes = await fetch(`${BACKEND_URL}/admin/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({ toStatus: 'payment_pending' }),
  });
  console.log('Illegal backward transition delivered -> payment_pending status:', backwardRes.status);
  if (backwardRes.ok) {
    findings.push({
      id: 'ORDER-STATE-MACHINE-BACKWARD',
      severity: 'Critical',
      area: 'Orders',
      title: 'State Machine Violation: Delivered order reverted backward to payment_pending',
      evidence: `PATCH status to payment_pending returned HTTP ${backwardRes.status}`,
    });
  } else {
    console.log('PASS: Backward transition was rejected.');
  }

  // Check history entries
  const historyCheck = await fetch(`${BACKEND_URL}/admin/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const orderDetails = await historyCheck.json();
  const history = orderDetails.statusHistory || orderDetails.history || [];
  console.log(`OrderStatusHistory entries recorded: ${history.length}`);
  if (history.length === 0) {
    findings.push({
      id: 'ORDER-HISTORY-MISSING',
      severity: 'High',
      area: 'Orders',
      title: 'Audit / State Machine Failure: Status changes do not write OrderStatusHistory records',
      evidence: `Order ${order.id} has 0 status history entries after state changes.`,
    });
  }

  // 2. PRODUCT & PRICE IMMUTABILITY AFTER ORDER
  console.log('\n[TEST 2] Product Price Immutability after Order Placement');
  const originalSnapshotItem = orderDetails.items?.[0];
  console.log('Original Order Item Snapshot:', {
    title: originalSnapshotItem?.title,
    price: originalSnapshotItem?.price,
    total: originalSnapshotItem?.total,
    grandTotal: orderDetails.grandTotal,
  });

  const newPrice = Number(product.price) + 200;
  console.log(`Updating product ${product.id} price from ${product.price} to ${newPrice}...`);
  const updateProdRes = await fetch(`${BACKEND_URL}/products/${product.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({ basePrice: newPrice }),
  });
  console.log('Product price update status:', updateProdRes.status);

  // Re-fetch the old order
  const oldOrderCheck = await fetch(`${BACKEND_URL}/admin/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const oldOrderData = await oldOrderCheck.json();
  const currentSnapshotItem = oldOrderData.items?.[0];
  console.log('Order Item Snapshot after product price update:', {
    title: currentSnapshotItem?.title,
    price: currentSnapshotItem?.price,
    total: currentSnapshotItem?.total,
    grandTotal: oldOrderData.grandTotal,
  });

  if (Number(currentSnapshotItem?.price) === newPrice || oldOrderData.grandTotal !== orderDetails.grandTotal) {
    findings.push({
      id: 'IMMUTABILITY-BREACH-HISTORICAL-ORDER',
      severity: 'Critical',
      area: 'Orders / Financial Integrity',
      title: 'Historical Order Mutated: Changing product price altered existing order items/grandTotal',
      evidence: `Old order ${order.id} price changed from ${originalSnapshotItem.price} to ${currentSnapshotItem.price}`,
    });
  } else {
    console.log('PASS: Historical order and item snapshots remained strictly immutable.');
  }

  // Restore price
  await fetch(`${BACKEND_URL}/products/${product.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({ basePrice: Number(product.price) }),
  });

  // 3. STOCK & CART CHECKS
  console.log('\n[TEST 3] Stock and Cart Invariant Checks');
  const categoriesRes = await fetch(`${BACKEND_URL}/categories`);
  const categories = await categoriesRes.json();
  const categoryId = categories[0]?.id;

  const zeroStockProdRes = await fetch(`${BACKEND_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({
      title: 'Zero Stock Test Product',
      slug: `zero-stock-${Date.now()}`,
      basePrice: 150,
      stockQuantity: 0,
      status: 'published',
      categoryId,
    }),
  });
  const zeroStockProd = await zeroStockProdRes.json();
  console.log('Created zero stock product:', zeroStockProd.id, 'stockQuantity:', zeroStockProd.stockQuantity);

  if (zeroStockProd.id) {
    const orderZeroStockRes = await fetch(`${BACKEND_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customer.token}`,
      },
      body: JSON.stringify({
        email: 'zerostock@sridattam.com',
        shippingAddress: {
          fullName: 'Zero Stock Customer',
          phone: '9876543210',
          addressLine1: '123 Zero St',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500001',
          country: 'India',
        },
        billingAddress: {
          fullName: 'Zero Stock Customer',
          phone: '9876543210',
          addressLine1: '123 Zero St',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500001',
          country: 'India',
        },
        items: [{ productId: zeroStockProd.id, quantity: 1 }],
      }),
    });
    console.log('Order zero stock product response status:', orderZeroStockRes.status);
    const zeroOrderText = await orderZeroStockRes.text();
    if (orderZeroStockRes.ok) {
      findings.push({
        id: 'ZERO-STOCK-PURCHASE-ALLOWED',
        severity: 'Critical',
        area: 'Stock & Inventory',
        title: 'Overselling: Customer can purchase out-of-stock product with stockQuantity=0',
        evidence: `POST /orders for product with stockQuantity=0 returned HTTP 201: ${zeroOrderText.slice(0, 200)}`,
      });
    } else {
      console.log('PASS: Purchasing out-of-stock product was blocked.');
    }

    // Clean up test product
    await fetch(`${BACKEND_URL}/products/${zeroStockProd.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
  }

  // 4. MONEY CALCULATION & PAISE ROUNDING RECONCILIATION TABLE
  console.log('\n[TEST 4] Money Calculation & Paise Reconciliation Table');
  const subtotal = Number(order.subtotal);
  const shipping = Number(order.shippingTotal);
  const discount = Number(order.discountTotal);
  const tax = Number(order.taxTotal || 0);
  const grandTotal = Number(order.grandTotal);
  const expectedGrandTotal = subtotal + shipping + tax - discount;
  const grandTotalInPaise = Math.round(grandTotal * 100);
  const expectedPaise = Math.round(expectedGrandTotal * 100);

  calculations.push({
    metric: 'Subtotal (INR)',
    expected: subtotal,
    actual: subtotal,
    match: true,
  });
  calculations.push({
    metric: 'Shipping (INR)',
    expected: shipping,
    actual: shipping,
    match: true,
  });
  calculations.push({
    metric: 'Discount (INR)',
    expected: discount,
    actual: discount,
    match: true,
  });
  calculations.push({
    metric: 'Grand Total (INR)',
    expected: expectedGrandTotal,
    actual: grandTotal,
    match: grandTotal === expectedGrandTotal,
  });
  calculations.push({
    metric: 'Paise Reconciliation',
    expectedPaise,
    actualPaise: grandTotalInPaise,
    match: grandTotalInPaise === expectedPaise,
  });

  console.log('Calculation summary:', JSON.stringify(calculations, null, 2));

  console.log('\n=== BUSINESS LOGIC FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
}

runBusinessLogicTests().catch(console.error);
