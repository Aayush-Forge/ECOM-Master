/**
 * Product Variations E2E Test Suite
 *
 * Prerequisites:
 * 1. Start backend server:
 *    cd backend && npm run start:dev
 * 2. Start frontend server:
 *    npm run dev
 *
 * Run instructions:
 *    node backend/test/variations.e2e.js
 *
 * Environment variables:
 *    BACKEND_URL (default: http://localhost:5000)
 *    FRONTEND_URL (default: http://localhost:3000)
 *    ADMIN_EMAIL (default: admin@sridattam.com)
 *    ADMIN_PASSWORD (default: password123)
 *    READ_ONLY_EMAIL (default: read_only@sridattam.com)
 *    READ_ONLY_PASSWORD (default: password123)
 *    CUSTOMER_EMAIL (default: customer@sridattam.com)
 *    CUSTOMER_PASSWORD (default: password123)
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sridattam.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const READ_ONLY_EMAIL = process.env.READ_ONLY_EMAIL || 'read_only@sridattam.com';
const READ_ONLY_PASSWORD = process.env.READ_ONLY_PASSWORD || 'password123';
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'customer@sridattam.com';
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'password123';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✅ PASS: ${msg}`);
    testsPassed++;
  }
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email} with status ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

const createdProductIds = new Set();
const createdOrderIds = new Set();

async function cleanup(adminToken) {
  console.log('\n--- Running Guaranteed Cleanup ---');
  const headers = { Authorization: `Bearer ${adminToken}` };

  for (const prodId of createdProductIds) {
    try {
      await fetch(`${BASE_URL}/admin/delete-products/${prodId}`, {
        method: 'DELETE',
        headers,
      });
      console.log(`Cleaned up test product: ${prodId}`);
    } catch (e) {
      console.warn(`Failed to cleanup product ${prodId}:`, e.message);
    }
  }

  // Attempt direct DB cleanup for any created test orders if pg is available
  if (createdOrderIds.size > 0) {
    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString:
          process.env.DATABASE_URL ||
          'postgresql://sridattam_admin:sridattam_secure_pass_2026@localhost:5432/sridattam_dev_db',
      });
      await client.connect();
      const ids = Array.from(createdOrderIds);
      await client.query('DELETE FROM order_items WHERE order_id = ANY($1)', [ids]);
      await client.query('DELETE FROM orders WHERE id = ANY($1)', [ids]);
      console.log(`Cleaned up ${ids.length} test order(s)`);
      await client.end();
    } catch {
      // Non-fatal if order cleanup via direct DB is unavailable
    }
  }
}

async function run() {
  console.log('--- Starting Product Variations Comprehensive E2E Test Suite ---');

  // Authenticate dynamically using environment variables
  console.log('Logging in test accounts...');
  const adminToken = await loginUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  const readOnlyToken = await loginUser(READ_ONLY_EMAIL, READ_ONLY_PASSWORD);
  const customerToken = await loginUser(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  try {
    // Fetch a sample product for category ID and simple product tests
    const catRes = await fetch(`${BASE_URL}/all-products`);
    assert(catRes.ok, 'Fetch all-products OK');
    const catData = await catRes.json();
    const sampleProduct = (catData.data || catData)[0];
    const categoryId = sampleProduct.categoryId;

    // -------------------------------------------------------------
    // Test 1: Public DHC-NAN-36 Response (No Leak Defense)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Public DHC-NAN-36 Response (No Leak Defense) ---');
    const dhcRes = await fetch(`${BASE_URL}/products/DHC-NAN-36`);
    assert(dhcRes.ok, 'GET /products/DHC-NAN-36 returns 200');
    const dhc = await dhcRes.json();
    assert(dhc.type === 'variable', 'DHC-NAN-36 type is "variable"');
    assert(Array.isArray(dhc.attributes) && dhc.attributes.length === 2, 'Has 2 attributes');
    assert(Array.isArray(dhc.variationsData) && dhc.variationsData.length === 9, 'Has 9 variationsData items');
    assert(dhc.attributes[0].name === 'Color', 'attribute 1 is Color');
    assert(dhc.variationsData[0].regular_price === 199, 'regular_price 199 for the first DHC-NAN-36 variation');
    assert(dhc.variationsData[0].sale_price === 179, 'sale_price 179 for the first DHC-NAN-36 variation');
    assert(dhc.variationsData[0].sku === 'DHC-NAN-36-RED-L', 'First variation SKU is DHC-NAN-36-RED-L');
    assert(typeof dhc.variationsData[0].price === 'number', 'Variation price is a number');
    assert(dhc.variationsData[0].price === 179, 'Effective price matches sale_price (179)');
    assert(dhc.variationsData[0].stock_status === 'instock', 'Stock status is instock');
    assert(dhc.variationsData[0].isActive === undefined, 'Public variationsData does not leak isActive');
    assert(dhc.variations === undefined, 'Public response strips raw variations array');
    assert(dhc.version === undefined, 'Public response strips raw version');

    // -------------------------------------------------------------
    // Test 2: Admin Create Variable Product
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Admin Create Variable Product ---');
    const uniqueSuffix = Date.now();
    const createPayload = {
      title: `E2E Variable Dhoop ${uniqueSuffix}`,
      slug: `e2e-variable-dhoop-${uniqueSuffix}`,
      sku: `E2E-VAR-${uniqueSuffix}`,
      categoryId,
      productType: 'variable',
      attributes: [
        {
          name: 'Size',
          slug: 'size',
          options: ['Small', 'Large'],
          variation: true,
          visible: true,
        },
        {
          name: 'Fragrance',
          slug: 'fragrance',
          options: ['Mogra', 'Champa'],
          variation: true,
          visible: true,
        },
      ],
      variations: [
        {
          regularPrice: 200,
          salePrice: 160,
          stockQuantity: 25,
          attributes: [
            { name: 'Size', option: 'Small' },
            { name: 'Fragrance', option: 'Mogra' },
          ],
        },
        {
          regularPrice: 250,
          salePrice: 210,
          stockQuantity: 15,
          attributes: [
            { name: 'Size', option: 'Small' },
            { name: 'Fragrance', option: 'Champa' },
          ],
        },
        {
          regularPrice: 350,
          stockQuantity: 10,
          attributes: [
            { name: 'Size', option: 'Large' },
            { name: 'Fragrance', option: 'Mogra' },
          ],
        },
      ],
    };

    const createRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(createPayload),
    });

    assert(createRes.ok, `Create variable product succeeded: ${createRes.status}`);
    const createdProd = await createRes.json();
    const prodId = createdProd.id;
    createdProductIds.add(prodId);

    assert(createdProd.type === 'variable', 'Created product type is variable');
    assert(createdProd.version === 1, 'Initial version is 1');
    assert(Number(createdProd.basePrice) === 160, `Parent basePrice is min effective price (160), got ${createdProd.basePrice}`);
    assert(Number(createdProd.stockQuantity) === 50, `Parent stockQuantity is sum of stocks (25+15+10 = 50), got ${createdProd.stockQuantity}`);
    assert(createdProd.variationsData.length === 3, 'Created 3 variations');

    const v1 = createdProd.variationsData[0];
    const v2 = createdProd.variationsData[1];
    const v3 = createdProd.variationsData[2];

    assert(v1.sku === `E2E-VAR-${uniqueSuffix}-01`, `Auto-generated SKU 1: ${v1.sku}`);
    assert(v2.sku === `E2E-VAR-${uniqueSuffix}-02`, `Auto-generated SKU 2: ${v2.sku}`);
    assert(v3.sku === `E2E-VAR-${uniqueSuffix}-03`, `Auto-generated SKU 3: ${v3.sku}`);

    // -------------------------------------------------------------
    // Test 3: SKU Uniqueness Validation (409)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: SKU Uniqueness Validation (409) ---');
    const dupBatchRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...createPayload,
        slug: `dup-batch-${uniqueSuffix}`,
        sku: `E2E-DUP-B-${uniqueSuffix}`,
        variations: [
          { sku: 'DUP-1', regularPrice: 100, attributes: [{ name: 'Size', option: 'Small' }] },
          { sku: 'DUP-1', regularPrice: 100, attributes: [{ name: 'Size', option: 'Large' }] },
        ],
      }),
    });
    assert(dupBatchRes.status === 409, `Duplicate SKU within batch rejected: 409`);

    const dupCrossRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...createPayload,
        slug: `dup-cross-${uniqueSuffix}`,
        sku: `E2E-DUP-C-${uniqueSuffix}`,
        variations: [
          { sku: v1.sku, regularPrice: 100, attributes: [{ name: 'Size', option: 'Small' }] },
        ],
      }),
    });
    assert(dupCrossRes.status === 409, `Duplicate variation SKU across products rejected: 409`);

    const dupParentRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...createPayload,
        slug: `dup-parent-${uniqueSuffix}`,
        sku: `E2E-DUP-P-${uniqueSuffix}`,
        variations: [
          { sku: sampleProduct.sku, regularPrice: 100, attributes: [{ name: 'Size', option: 'Small' }] },
        ],
      }),
    });
    assert(dupParentRes.status === 409, `Variation SKU matching existing parent SKU rejected: 409`);

    // -------------------------------------------------------------
    // Test 4: Input Validation (400)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Input Validation (400) ---');
    const zeroVarRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...createPayload,
        slug: `zero-var-${uniqueSuffix}`,
        sku: `E2E-ZERO-${uniqueSuffix}`,
        variations: [],
      }),
    });
    assert(zeroVarRes.status === 400, `0 variations rejected: 400`);

    const undeclaredAttrRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...createPayload,
        slug: `undec-${uniqueSuffix}`,
        sku: `E2E-UNDEC-${uniqueSuffix}`,
        variations: [{ regularPrice: 100, attributes: [{ name: 'Invalid', option: 'X' }] }],
      }),
    });
    assert(undeclaredAttrRes.status === 400, `Undeclared attribute rejected: 400`);

    const dupComboRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...createPayload,
        slug: `dup-combo-${uniqueSuffix}`,
        sku: `E2E-DUPCOMBO-${uniqueSuffix}`,
        variations: [
          { regularPrice: 100, attributes: [{ name: 'Size', option: 'Small' }] },
          { regularPrice: 120, attributes: [{ name: 'Size', option: 'Small' }] },
        ],
      }),
    });
    assert(dupComboRes.status === 400, `Duplicate attribute combination rejected: 400`);

    const invalidSalePriceRes = await fetch(`${BASE_URL}/admin/create-products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        ...createPayload,
        slug: `inv-sale-${uniqueSuffix}`,
        sku: `E2E-INVSALE-${uniqueSuffix}`,
        variations: [
          { regularPrice: 100, salePrice: 100, attributes: [{ name: 'Size', option: 'Small' }] },
        ],
      }),
    });
    assert(invalidSalePriceRes.status === 400, `salePrice >= regularPrice -> 400: got ${invalidSalePriceRes.status}`);

    // -------------------------------------------------------------
    // Test 5: Optimistic Locking on Update (409)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Optimistic Locking on Update (409) ---');
    const staleUpdateRes = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ version: 999, variations: [{ id: v1.id, regularPrice: 220, attributes: v1.attributes }] }),
    });
    assert(staleUpdateRes.status === 409, `Stale version rejected: 409`);

    const noVersionRes = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ title: 'No version test' }),
    });
    assert(noVersionRes.status === 409, `Missing version on variable update rejected: 409`);

    // -------------------------------------------------------------
    // Test 6: Variation Omission & Soft Deactivation
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Variation Omission & Soft Deactivation ---');
    const updateRes = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        version: 1,
        variations: [
          { id: v1.id, regularPrice: 180, salePrice: 150, stockQuantity: 30, attributes: v1.attributes },
          { id: v2.id, regularPrice: 250, stockQuantity: 20, attributes: v2.attributes },
        ],
      }),
    });
    assert(updateRes.ok, `Update variable product succeeded: ${updateRes.status}`);
    const updatedProd = await updateRes.json();
    assert(updatedProd.version === 2, `Version incremented to 2, got ${updatedProd.version}`);
    assert(Number(updatedProd.basePrice) === 150, `Parent basePrice updated to 150, got ${updatedProd.basePrice}`);
    assert(Number(updatedProd.stockQuantity) === 50, `Parent stock updated to 30 + 20 = 50, got ${updatedProd.stockQuantity}`);

    // Public GET returns active only
    const pubGetRes = await fetch(`${BASE_URL}/products/${prodId}`);
    assert(pubGetRes.ok, 'Public GET returns 200');
    const pubProd = await pubGetRes.json();
    assert(pubProd.variationsData.length === 2, `Public GET returns only 2 active variations: got ${pubProd.variationsData.length}`);
    assert(pubProd.variations === undefined, 'Public GET does not leak raw variations array');

    // Admin GET returns all with isActive property
    const adminGetRes = await fetch(`${BASE_URL}/admin/products/${prodId}`, { headers: adminHeaders });
    assert(adminGetRes.ok, 'Admin GET returns 200');
    const adminProd = await adminGetRes.json();
    assert(adminProd.variationsData.length === 3, `Admin GET returns all 3 variations: got ${adminProd.variationsData.length}`);
    const adminV3 = adminProd.variationsData.find((v) => v.id === v3.id);
    assert(adminV3 && adminV3.isActive === false, 'Deactivated variation has isActive: false on admin GET');

    // -------------------------------------------------------------
    // Test 7: New Requirements (a, b, c, d)
    // -------------------------------------------------------------
    console.log('\n--- Test 7a: Audit-log row on variation price, stock and SKU change ---');
    const newSku = `E2E-VAR-${uniqueSuffix}-01-RENAMED`;
    const auditUpdateRes = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        version: 2,
        variations: [
          { id: v1.id, sku: newSku, regularPrice: 195, salePrice: 145, stockQuantity: 28, attributes: v1.attributes },
          { id: v2.id, regularPrice: 250, stockQuantity: 20, attributes: v2.attributes },
        ],
      }),
    });
    assert(auditUpdateRes.ok, `Audit triggering update succeeded: ${auditUpdateRes.status}`);

    // Verify audit log entry
    const auditRes = await fetch(`${BASE_URL}/audit-logs?entityType=product`, {
      headers: adminHeaders,
    });
    assert(auditRes.ok, `GET /audit-logs returns 200: ${auditRes.status}`);
    const auditLogs = await auditRes.json();
    const productAuditLog = auditLogs.find((l) => l.entityId === prodId);
    assert(productAuditLog !== undefined, `Found audit log entry for product ${prodId}`);
    assert(productAuditLog.actionType === 'PRODUCT_VARIATION_UPDATE', `Audit actionType is PRODUCT_VARIATION_UPDATE`);
    assert(productAuditLog.beforeValue && productAuditLog.afterValue, `Audit log contains beforeValue and afterValue`);
    console.log('Verified audit log entry:', {
      actionType: productAuditLog.actionType,
      entityId: productAuditLog.entityId,
      beforeVersion: productAuditLog.beforeValue.version,
      afterVersion: productAuditLog.afterValue.version,
    });

    console.log('\n--- Test 7b: Update setting ALL variations inactive ---');
    const allInactiveRes = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        version: 3,
        variations: [
          { id: v1.id, sku: newSku, regularPrice: 195, salePrice: 145, stockQuantity: 28, attributes: v1.attributes, isActive: false },
          { id: v2.id, regularPrice: 250, stockQuantity: 20, attributes: v2.attributes, isActive: false },
        ],
      }),
    });
    assert(allInactiveRes.status === 400, `Setting all variations inactive rejected with 400: got ${allInactiveRes.status}`);
    const allInactiveBody = await allInactiveRes.json();
    console.log('Status: 400 | Body:', allInactiveBody);
    assert(
      allInactiveBody.message.includes('at least one active variation'),
      `Correct error message: "${allInactiveBody.message}"`,
    );

    console.log('\n--- Test 7c: Parallel creates with same variation SKU (race condition) ---');
    const raceSku = `RACE-SKU-${Date.now()}`;
    const racePayloadA = {
      title: `Race Product A ${Date.now()}`,
      slug: `race-prod-a-${Date.now()}`,
      sku: `RACE-P-A-${Date.now()}`,
      categoryId,
      productType: 'variable',
      attributes: [{ name: 'Size', options: ['Std'] }],
      variations: [{ sku: raceSku, regularPrice: 100, attributes: [{ name: 'Size', option: 'Std' }] }],
    };
    const racePayloadB = {
      title: `Race Product B ${Date.now()}`,
      slug: `race-prod-b-${Date.now()}`,
      sku: `RACE-P-B-${Date.now()}`,
      categoryId,
      productType: 'variable',
      attributes: [{ name: 'Size', options: ['Std'] }],
      variations: [{ sku: raceSku, regularPrice: 100, attributes: [{ name: 'Size', option: 'Std' }] }],
    };

    const [resRaceA, resRaceB] = await Promise.all([
      fetch(`${BASE_URL}/admin/create-products`, { method: 'POST', headers: adminHeaders, body: JSON.stringify(racePayloadA) }),
      fetch(`${BASE_URL}/admin/create-products`, { method: 'POST', headers: adminHeaders, body: JSON.stringify(racePayloadB) }),
    ]);

    const statuses = [resRaceA.status, resRaceB.status].sort();
    assert(statuses[0] === 201 && statuses[1] === 409, `Exactly one 201 and one 409: got [${resRaceA.status}, ${resRaceB.status}]`);
    if (resRaceA.status === 201) {
      const bA = await resRaceA.json();
      createdProductIds.add(bA.id);
    }
    if (resRaceB.status === 201) {
      const bB = await resRaceB.json();
      createdProductIds.add(bB.id);
    }

    console.log('\n--- Test 7d: Role Authorization on update-products (403) ---');
    const resRO = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${readOnlyToken}` },
      body: JSON.stringify({ title: 'Test Forbidden RO', version: 3 }),
    });
    assert(resRO.status === 403, `read_only token rejected with 403: got ${resRO.status}`);

    const resCust = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ title: 'Test Forbidden Customer', version: 3 }),
    });
    assert(resCust.status === 403, `customer token rejected with 403: got ${resCust.status}`);

    // Confirm admin token is allowed
    const resAdminAllowed = await fetch(`${BASE_URL}/admin/update-products/${prodId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ title: `Allowed Admin Title ${Date.now()}`, version: 3 }),
    });
    assert(resAdminAllowed.status === 200, `admin token allowed with 200: got ${resAdminAllowed.status}`);

    // -------------------------------------------------------------
    // Test 8: Orders Service Integration
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Orders Service Integration ---');

    // 8a: variable product without variationId -> 400
    const noVarOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: prodId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Street',
          city: 'City',
          state: 'State',
          postalCode: '560001',
        },
      }),
    });
    assert(noVarOrderRes.status === 400, `variable product without variationId -> 400: got ${noVarOrderRes.status}`);

    // 8b: simple product with variationId -> 400
    const simpleWithVarRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: sampleProduct.id, variationId: v1.id, quantity: 1 }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Street',
          city: 'City',
          state: 'State',
          postalCode: '560001',
        },
      }),
    });
    assert(simpleWithVarRes.status === 400, `simple product with variationId -> 400: got ${simpleWithVarRes.status}`);

    // 8c: inactive variation -> 400
    const inactiveVarRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: prodId, variationId: v3.id, quantity: 1 }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Street',
          city: 'City',
          state: 'State',
          postalCode: '560001',
        },
      }),
    });
    assert(inactiveVarRes.status === 400, `inactive variation -> 400: got ${inactiveVarRes.status}`);

    // 8d: quantity > variation stock -> 400
    // v1 stock is 28 after Test 7a
    const overStockRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: prodId, variationId: v1.id, quantity: 9999 }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Street',
          city: 'City',
          state: 'State',
          postalCode: '560001',
        },
      }),
    });
    assert(overStockRes.status === 400, `quantity > variation stock -> 400: got ${overStockRes.status}`);

    // 8e: valid order -> 201 with 1 item; client sends forged price (999) to verify server overrides
    const validOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: prodId, variationId: v1.id, quantity: 2, price: 999 }],
        shippingAddress: {
          fullName: 'Ravi Kumar',
          phone: '9876543210',
          addressLine1: '123 Temple Road',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }),
    });
    assert(validOrderRes.ok, `valid order -> 201: got ${validOrderRes.status}`);
    const orderData = await validOrderRes.json();
    createdOrderIds.add(orderData.id);
    assert(orderData.items.length === 1, `valid order has 1 item: got ${orderData.items.length}`);
    const orderItem = orderData.items[0];
    assert(orderItem.variantId === v1.id, `orderItem.variantId matches: ${orderItem.variantId}`);
    assert(orderItem.skuSnapshot === newSku, `skuSnapshot equals the variation sku (${newSku}): got ${orderItem.skuSnapshot}`);
    assert(orderItem.titleSnapshot.includes('Small') && orderItem.titleSnapshot.includes('Mogra'), `titleSnapshot contains the option labels: got "${orderItem.titleSnapshot}"`);
    assert(Number(orderItem.unitPriceSnapshot) === 145, `unitPriceSnapshot equals the server-side effective price (145) even if client sends different price: got ${orderItem.unitPriceSnapshot}`);
    assert(Array.isArray(orderItem.attributesSnapshot), 'orderItem.attributesSnapshot is array');

    // 8f: variation stock unchanged after the order
    const adminCheckRes = await fetch(`${BASE_URL}/admin/products/${prodId}`, { headers: adminHeaders });
    const adminCheckProd = await adminCheckRes.json();
    const checkedV1 = adminCheckProd.variationsData.find((v) => v.id === v1.id);
    assert(checkedV1 && checkedV1.stock_quantity === 28, `variation stock unchanged after the order: got ${checkedV1?.stock_quantity}`);

    // -------------------------------------------------------------
    // Test 9: Storefront PDP Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Storefront PDP Verification ---');
    const storefrontRes = await fetch(`${FRONTEND_URL}/products/lobhan-earthy-resin-dhoop-cones-easy-light-temple-cones-pack-of-36`);
    assert(storefrontRes.ok, `Storefront PDP returns 200: got ${storefrontRes.status}`);
    const html = await storefrontRes.text();
    assert(html.includes('Color') || html.includes('Size') || html.includes('DHC-NAN-36'), 'Storefront rendered attributes successfully');

    console.log(`\n=========================================`);
    console.log(`ALL TESTS PASSED: ${testsPassed}/${testsPassed + testsFailed}`);
    console.log(`=========================================`);
  } finally {
    await cleanup(adminToken);
  }
}

run().catch((e) => {
  console.error('\n❌ Test suite failed:', e);
  process.exit(1);
});
