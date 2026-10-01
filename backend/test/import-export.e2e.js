/**
 * Product Import/Export E2E Integration Test Suite
 * Run: node backend/test/import-export.e2e.js
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sridattam.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

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

async function loginAdmin() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function run() {
  console.log('--- Starting Product Import/Export E2E Test Suite ---');
  const token = await loginAdmin();
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const testParentSku = `IE-PARENT-${Date.now()}`;
  const testVar1Sku = `${testParentSku}-RED-S`;
  const testVar2Sku = `${testParentSku}-BLUE-M`;

  try {
    // 1. Export CSV test
    console.log('\n--- Test 1: Export Products CSV ---');
    const exportRes = await fetch(`${BASE_URL}/admin/products/export-csv`, {
      headers: authHeaders,
    });
    assert(exportRes.status === 200, `Export returned 200: got ${exportRes.status}`);
    const exportText = await exportRes.text();
    assert(exportText.includes('Handle,Type,SKU,Parent SKU,Title'), 'Contains CSV standard headers');
    console.log('Export CSV snippet:\n', exportText.slice(0, 300));

    // 2. Import CSV test with a variable product and 2 variations
    console.log('\n--- Test 2: Import CSV with Multi-Row Variable Product ---');
    const csvToImport = [
      'Handle,Type,SKU,Parent SKU,Title,Description,Category,Regular Price,Sale Price,Stock,Images,Attributes,Status',
      `${testParentSku.toLowerCase()},variable,${testParentSku},,Imported Sandalwood Dhoop,Pure Mysore Sandalwood,Incense & Cones,250,220,50,https://cdn.example.com/parent.jpg,"Color: Red, Blue | Size: S, M",active`,
      `${testParentSku.toLowerCase()},variation,${testVar1Sku},${testParentSku},Imported Sandalwood Dhoop - Red S,,Incense & Cones,250,220,30,https://cdn.example.com/red.jpg,"Color: Red | Size: S",active`,
      `${testParentSku.toLowerCase()},variation,${testVar2Sku},${testParentSku},Imported Sandalwood Dhoop - Blue M,,Incense & Cones,260,,20,https://cdn.example.com/blue.jpg,"Color: Blue | Size: M",active`,
    ].join('\r\n');

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="products.csv"\r\n` +
      `Content-Type: text/csv\r\n\r\n` +
      `${csvToImport}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="updateExisting"\r\n\r\n` +
      `true\r\n` +
      `--${boundary}--\r\n`;

    const importRes = await fetch(`${BASE_URL}/admin/products/import-csv`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formBody,
    });

    assert(importRes.status === 201, `Import returned 201: got ${importRes.status}`);
    const importResult = await importRes.json();
    console.log('Import result:', importResult);

    assert(importResult.createdParents === 1, `1 parent product created: got ${importResult.createdParents}`);
    assert(importResult.totalVariations === 2, `2 variations imported: got ${importResult.totalVariations}`);

    // 3. Verify created product via Admin GET
    console.log('\n--- Test 3: Verify Imported Product in Database ---');
    const getRes = await fetch(`${BASE_URL}/admin/products/${testParentSku}`, {
      headers: authHeaders,
    });
    assert(getRes.ok, `Fetch product by SKU succeeded: got ${getRes.status}`);
    const product = await getRes.json();

    assert(product.sku === testParentSku, `Parent SKU matches: got ${product.sku}`);
    assert(product.productType === 'variable', `Product type is variable: got ${product.productType}`);
    // Min price between 220 (var1 sale) and 260 (var2 reg) is 220
    assert(Number(product.basePrice) === 220, `Parent basePrice computed as min effective price (220): got ${product.basePrice}`);
    // Stock sum: 30 + 20 = 50
    assert(product.stockQuantity === 50, `Parent stockQuantity computed as sum of variations (50): got ${product.stockQuantity}`);
    assert(Array.isArray(product.variations) && product.variations.length === 2, `Contains 2 variations: got ${product.variations?.length}`);

    // 4. Update via CSV (modify price and stock)
    console.log('\n--- Test 4: UPSERT Existing Product via CSV ---');
    const csvUpdate = [
      'Handle,Type,SKU,Parent SKU,Title,Description,Category,Regular Price,Sale Price,Stock,Images,Attributes,Status',
      `${testParentSku.toLowerCase()},variable,${testParentSku},,Imported Sandalwood Dhoop Updated,Pure Mysore Sandalwood,Incense & Cones,300,199,80,https://cdn.example.com/parent.jpg,"Color: Red, Blue | Size: S, M",active`,
      `${testParentSku.toLowerCase()},variation,${testVar1Sku},${testParentSku},Imported Sandalwood Dhoop - Red S,,Incense & Cones,300,199,50,https://cdn.example.com/red.jpg,"Color: Red | Size: S",active`,
      `${testParentSku.toLowerCase()},variation,${testVar2Sku},${testParentSku},Imported Sandalwood Dhoop - Blue M,,Incense & Cones,300,,30,https://cdn.example.com/blue.jpg,"Color: Blue | Size: M",active`,
    ].join('\r\n');

    const updateFormBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="products.csv"\r\n` +
      `Content-Type: text/csv\r\n\r\n` +
      `${csvUpdate}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="updateExisting"\r\n\r\n` +
      `true\r\n` +
      `--${boundary}--\r\n`;

    const updateRes = await fetch(`${BASE_URL}/admin/products/import-csv`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: updateFormBody,
    });

    assert(updateRes.status === 201, `Update import returned 201: got ${updateRes.status}`);
    const updateResult = await updateRes.json();
    assert(updateResult.updatedParents === 1, `1 parent product updated: got ${updateResult.updatedParents}`);

    // Verify updated values
    const getUpdatedRes = await fetch(`${BASE_URL}/admin/products/${testParentSku}`, {
      headers: authHeaders,
    });
    const updatedProd = await getUpdatedRes.json();
    assert(updatedProd.title === 'Imported Sandalwood Dhoop Updated', `Title updated: got ${updatedProd.title}`);
    assert(Number(updatedProd.basePrice) === 199, `Base price updated to new min (199): got ${updatedProd.basePrice}`);
    assert(updatedProd.stockQuantity === 80, `Stock updated to new sum (80): got ${updatedProd.stockQuantity}`);

    console.log(`\n=========================================`);
    console.log(`ALL TESTS PASSED: ${testsPassed}/${testsPassed + testsFailed}`);
    console.log(`=========================================`);
  } finally {
    // Cleanup imported product
    try {
      const getDel = await fetch(`${BASE_URL}/admin/products/${testParentSku}`);
      if (getDel.ok) {
        const p = await getDel.json();
        await fetch(`${BASE_URL}/admin/delete-products/${p.id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        console.log(`Cleaned up test product: ${p.id}`);
      }
    } catch {}
  }
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
