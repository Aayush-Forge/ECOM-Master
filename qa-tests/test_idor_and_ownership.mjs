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

async function runIdorTests() {
  console.log('--- RUNNING IDOR & OWNERSHIP TESTS ---');
  const userA = await login('customer@sridattam.com', 'password123');
  const userB = await login('customer2@sridattam.com', 'password123');

  const findings = [];

  // 1. ADDRESSES IDOR: User A creates address, User B tries to view, update, delete, setDefault
  console.log('\n[TEST 1] Address IDOR: User A creates address, User B attempts manipulation');
  const addrRes = await fetch(`${BACKEND_URL}/addresses/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      fullName: 'User A Address',
      phone: '9876543210',
      addressLine1: '123 User A St',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500001',
      country: 'India',
      isDefault: false,
    }),
  });
  const addrA = await addrRes.json();
  console.log('User A created address:', addrA.id || addrA);

  if (addrA.id) {
    // User B tries to update User A's address
    const bUpdate = await fetch(`${BACKEND_URL}/addresses/me/${addrA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`,
      },
      body: JSON.stringify({ fullName: 'Hacked by User B' }),
    });
    console.log('User B update User A address status:', bUpdate.status);
    if (bUpdate.ok) {
      findings.push({
        id: 'IDOR-01',
        severity: 'Critical',
        area: 'Addresses',
        title: 'IDOR: User B can update User A address',
        evidence: `PATCH /addresses/me/${addrA.id} returned HTTP ${bUpdate.status}`,
      });
    }

    // User B tries to setDefault User A's address
    const bDefault = await fetch(`${BACKEND_URL}/addresses/me/${addrA.id}/default`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`,
      },
    });
    console.log('User B set-default User A address status:', bDefault.status);
    if (bDefault.ok) {
      findings.push({
        id: 'IDOR-02',
        severity: 'Critical',
        area: 'Addresses',
        title: 'IDOR: User B can set User A address as default',
        evidence: `PATCH /addresses/me/${addrA.id}/default returned HTTP ${bDefault.status}`,
      });
    }

    // User B tries to delete User A's address
    const bDelete = await fetch(`${BACKEND_URL}/addresses/me/${addrA.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userB.token}`,
      },
    });
    console.log('User B delete User A address status:', bDelete.status);
    if (bDelete.ok) {
      findings.push({
        id: 'IDOR-03',
        severity: 'Critical',
        area: 'Addresses',
        title: 'IDOR: User B can delete User A address',
        evidence: `DELETE /addresses/me/${addrA.id} returned HTTP ${bDelete.status}`,
      });
    }

    // Clean up address
    await fetch(`${BACKEND_URL}/addresses/me/${addrA.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
  }

  // 2. ORDER IDOR & ANONYMOUS LEAK ON GET /orders/:id
  console.log('\n[TEST 2] Orders IDOR & Public Access on GET /orders/:id');
  // First, get a real order ID from the system or create one
  const admin = await login('admin@sridattam.com', 'password123');
  const ordersListRes = await fetch(`${BACKEND_URL}/admin/orders?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const ordersData = await ordersListRes.json();
  const sampleOrder = ordersData.data?.[0] || ordersData.orders?.[0] || ordersData[0];

  if (sampleOrder) {
    const targetOrderId = sampleOrder.id;
    console.log(`Testing with existing order ID: ${targetOrderId}`);

    // Anonymous request (no token)
    const anonRes = await fetch(`${BACKEND_URL}/orders/${targetOrderId}`);
    const anonBody = await anonRes.json();
    console.log(`Anonymous GET /orders/${targetOrderId} status:`, anonRes.status);
    if (anonRes.ok) {
      console.log('Anonymous returned customer data:', {
        customerEmail: anonBody.customer?.email || anonBody.email,
        grandTotal: anonBody.grandTotal,
        hasAddresses: Boolean(anonBody.addresses),
      });
      findings.push({
        id: 'IDOR-ORDER-ANON',
        severity: 'Critical',
        area: 'Orders',
        title: 'Information Disclosure: Unauthenticated GET /orders/:id leaks customer PII and order data',
        evidence: `Anonymous GET /orders/${targetOrderId} returned HTTP 200 with customer data (Email: ${anonBody.customer?.email || anonBody.email}, Total: ${anonBody.grandTotal})`,
      });
    }

    // User B request (User B does not own User A's order)
    const userBRes = await fetch(`${BACKEND_URL}/orders/${targetOrderId}`, {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    console.log(`User B GET /orders/${targetOrderId} status:`, userBRes.status);
    if (userBRes.ok && sampleOrder.customerId !== userB.user.id) {
      findings.push({
        id: 'IDOR-ORDER-CROSS-USER',
        severity: 'Critical',
        area: 'Orders',
        title: 'IDOR: Customer B can view Customer A order details without ownership check',
        evidence: `GET /orders/${targetOrderId} with User B token returned HTTP 200`,
      });
    }
  }

  // 3. ORDER CREATION IDENTITY FORGERY: POST /orders
  console.log('\n[TEST 3] Order Creation Identity Forgery in POST /orders');
  // Test if client can pass arbitrary customerId or forged identity in body
  const prodRes = await fetch(`${BACKEND_URL}/products?page=1&per_page=1`);
  const prodData = await prodRes.json();
  const sampleProd = prodData.products?.[0] || prodData.data?.[0];

  if (sampleProd) {
    const forgedOrderPayload = {
      customerId: userA.user.id, // User B sends User A's ID
      email: 'victim@sridattam.com',
      shippingAddress: {
        fullName: 'Victim Customer',
        phone: '9876543210',
        addressLine1: '123 Crime St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      billingAddress: {
        fullName: 'Victim Customer',
        phone: '9876543210',
        addressLine1: '123 Crime St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      items: [
        {
          productId: sampleProd.id,
          quantity: 1,
        },
      ],
    };

    const forgedRes = await fetch(`${BACKEND_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`, // Sent by User B
      },
      body: JSON.stringify(forgedOrderPayload),
    });
    const forgedOrder = await forgedRes.json();
    console.log('Order creation with forged customerId response status:', forgedRes.status);
    if (forgedRes.ok) {
      console.log('Order created customerId:', forgedOrder.customerId, 'Expected User B ID:', userB.user.id);
      if (forgedOrder.customerId === userA.user.id) {
        findings.push({
          id: 'FORGERY-ORDER-CUSTOMERID',
          severity: 'Critical',
          area: 'Orders',
          title: 'Identity Forgery: POST /orders honors client-provided customerId from request body over JWT identity',
          evidence: `POST /orders by User B with User A's customerId created order with customerId=${forgedOrder.customerId}`,
        });
      } else {
        console.log('PASS: Server correctly attributed order to authenticated user or ignored body customerId.');
      }
    }
  }

  // 4. USER PROFILE IDOR: GET /users/me, PATCH /users/me
  console.log('\n[TEST 4] Profile IDOR & Mutation Check');
  const bProfile = await fetch(`${BACKEND_URL}/users/me`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  const bData = await bProfile.json();
  console.log('User B profile email:', bData.email);

  // Try mass assignment on profile update: pass role: "admin", id: userA.user.id
  const massAssign = await fetch(`${BACKEND_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userB.token}`,
    },
    body: JSON.stringify({
      firstName: 'Hacker',
      role: 'admin',
      id: userA.user.id,
    }),
  });
  const massResult = await massAssign.json();
  console.log('Profile update response:', massAssign.status, massResult.role);
  if (massResult.role === 'admin') {
    findings.push({
      id: 'MASS-ASSIGN-ROLE-PROFILE',
      severity: 'Critical',
      area: 'Users',
      title: 'Privilege Escalation via Mass Assignment on PATCH /users/me',
      evidence: `PATCH /users/me with {"role": "admin"} changed user role to admin!`,
    });
  }

  console.log('\n=== IDOR & OWNERSHIP FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
}

runIdorTests().catch(console.error);
