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

async function runValidationTests() {
  console.log('--- RUNNING VALIDATION, INJECTION & ERROR FORMAT TESTS ---');
  const admin = await login('admin@sridattam.com', 'password123');
  const customer = await login('customer@sridattam.com', 'password123');

  const findings = [];

  // Helper to test an endpoint with malformed payload and check error format
  async function testPayload(desc, endpoint, method, token, body, expectedStatuses = [400, 422]) {
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {}

      // Check for information leak (stack trace, DB error)
      const hasLeak =
        text.includes('prisma') ||
        text.includes('PrismaClient') ||
        text.includes('syntax error at or near') ||
        text.includes('passwordHash') ||
        text.includes('column') ||
        text.includes('Stack trace') ||
        (json && json.stack);

      if (hasLeak) {
        findings.push({
          id: 'INFO-LEAK-STACK-TRACE',
          severity: 'High',
          area: 'Error Handling',
          title: `Internal stack trace or DB schema leak on ${method} ${endpoint}`,
          evidence: `Payload "${desc}" caused leak: ${text.slice(0, 300)}`,
        });
      }

      // Check if server accepted invalid input with 200/201 when it should fail
      if (res.status === 200 || res.status === 201) {
        findings.push({
          id: 'VALIDATION-BYPASS',
          severity: 'Medium',
          area: 'Validation',
          title: `Unvalidated input accepted on ${method} ${endpoint}: ${desc}`,
          evidence: `Status ${res.status}: ${text.slice(0, 200)}`,
        });
      }

      return { status: res.status, json, text };
    } catch (err) {
      return { status: 'ERR', error: err.message };
    }
  }

  // 1. SQL Injection on Auth login
  console.log('\n[TEST 1] SQL Injection in Auth Login');
  await testPayload('SQLi in login email', '/auth/login', 'POST', null, {
    email: "' OR '1'='1' --",
    password: 'password123',
  });

  // 2. XSS in Address fields
  console.log('\n[TEST 2] XSS Injection in Customer Address');
  const xssPayload = "<script>alert('XSS')</script><img src=x onerror=alert(1)>";
  const xssRes = await fetch(`${BACKEND_URL}/addresses/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customer.token}`,
    },
    body: JSON.stringify({
      fullName: xssPayload,
      phone: '9876543210',
      addressLine1: xssPayload,
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    }),
  });
  const xssData = await xssRes.json();
  console.log('Address creation with XSS payload status:', xssRes.status);
  if (xssRes.ok) {
    console.log('Saved fullName:', xssData.fullName);
    if (xssData.fullName.includes('<script>')) {
      findings.push({
        id: 'XSS-STORED-ADDRESS',
        severity: 'Medium',
        area: 'Addresses',
        title: 'Stored XSS vulnerability in address fields (raw HTML tags saved unescaped/unsanitized)',
        evidence: `Saved address fullName contained raw unescaped script tag: "${xssData.fullName}"`,
      });
    }
    // Clean up
    await fetch(`${BACKEND_URL}/addresses/me/${xssData.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customer.token}` },
    });
  }

  // 3. Huge string DoS test (100,000 characters)
  console.log('\n[TEST 3] Extremely long string payload (100KB)');
  const hugeString = 'A'.repeat(100000);
  await testPayload('Huge string in address city', '/addresses/me', 'POST', customer.token, {
    fullName: 'Test User',
    phone: '9876543210',
    addressLine1: 'Test line',
    city: hugeString,
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  });

  // 4. Invalid types (sending string where array expected, object where string expected)
  console.log('\n[TEST 4] Wrong Types');
  await testPayload('Wrong types in order creation (items as string)', '/orders', 'POST', customer.token, {
    email: 'test@sridattam.com',
    shippingAddress: 'Invalid string address',
    items: 'not-an-array',
  });

  // 5. Negative and zero quantities in Cart and Orders
  console.log('\n[TEST 5] Negative and zero quantities');
  await testPayload('Negative quantity in cart item', '/cart/items', 'POST', null, {
    productId: 'b0e01729-160a-4da2-9bb0-f470559ebaa0',
    quantity: -5,
  });

  await testPayload('Zero quantity in cart item', '/cart/items', 'POST', null, {
    productId: 'b0e01729-160a-4da2-9bb0-f470559ebaa0',
    quantity: 0,
  });

  // 6. Invalid UUIDs in parameters
  console.log('\n[TEST 6] Invalid UUIDs in route params');
  const invalidUuidRes = await fetch(`${BACKEND_URL}/shipping-templates/not-a-valid-uuid`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  console.log('GET /shipping-templates/not-a-valid-uuid status:', invalidUuidRes.status);
  const uuidText = await invalidUuidRes.text();
  if (invalidUuidRes.status === 500) {
    findings.push({
      id: 'UNHANDLED-UUID-PARAM-500',
      severity: 'Medium',
      area: 'Shipping',
      title: 'Invalid UUID in route parameter causes HTTP 500 unhandled exception',
      evidence: `GET /shipping-templates/not-a-valid-uuid returned HTTP 500: ${uuidText.slice(0, 200)}`,
    });
  }

  // 7. Mass Assignment: Submitting role, status, price, userId on mutation routes
  console.log('\n[TEST 7] Mass Assignment on Customer Profile and Review Creation');
  const reviewRes = await fetch(`${BACKEND_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customer.token}`,
    },
    body: JSON.stringify({
      productId: 'b0e01729-160a-4da2-9bb0-f470559ebaa0',
      rating: 5,
      comment: 'Great product',
      isApproved: true, // Try to auto-approve review via mass assignment
      status: 'approved',
    }),
  });
  const reviewData = await reviewRes.json();
  console.log('Review creation status:', reviewRes.status, 'isApproved:', reviewData.isApproved, 'status:', reviewData.status);
  if (reviewData.isApproved === true || reviewData.status === 'approved') {
    findings.push({
      id: 'MASS-ASSIGN-REVIEW-APPROVAL',
      severity: 'High',
      area: 'Reviews',
      title: 'Mass Assignment: Unprivileged customer can self-approve reviews via request payload',
      evidence: `POST /reviews with {"isApproved": true} created pre-approved review!`,
    });
  }

  // 8. Leaks of password hashes in any responses
  console.log('\n[TEST 8] Password Hash Leak Scan across Admin User endpoints');
  const usersListRes = await fetch(`${BACKEND_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const usersText = await usersListRes.text();
  if (usersText.includes('passwordHash') || usersText.includes('$2b$10$')) {
    findings.push({
      id: 'PASSWORD-HASH-LEAK-ADMIN-USERS',
      severity: 'Critical',
      area: 'Users',
      title: 'Credential Leak: GET /admin/users leaks bcrypt password hashes in response payload',
      evidence: `GET /admin/users contained passwordHash or bcrypt hash in JSON response: ${usersText.slice(0, 300)}`,
    });
  } else {
    console.log('PASS: GET /admin/users does NOT leak password hashes.');
  }

  console.log('\n=== VALIDATION & INJECTION FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
}

runValidationTests().catch(console.error);
