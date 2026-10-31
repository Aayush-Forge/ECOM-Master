/**
 * Dynamic Shipping Rate Slabs & Invoice / Shipping Label Automated Test Suite
 *
 * Verifies:
 * 1. Shipping Slabs API: Full CRUD, active toggling, and persistence
 * 2. Dynamic Shipping Rate Calculator: Multi-tier weight & regional destination logic + free shipping thresholds
 * 3. Printable Tax Invoice Generation: Order details, GST breakdown, printable A4 HTML
 * 4. Printable Logistics Shipping Label Generation: Buyer/Seller details, 4x6" format, barcode & QR tracking
 * 5. Full-Stack Server Availability: Backend (:5000), Admin Portal (:3001), Storefront (:3000)
 */

const BACKEND_URL = 'http://localhost:5000';
const ADMIN_URL = 'http://localhost:3001';
const STOREFRONT_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${message}`);
  } else {
    failed++;
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${message}`);
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log(' SUITE 1: Dynamic Shipping Slabs CRUD API (/shipping-slabs)');
  console.log('===============================================================');

  // 1.1 Fetch all slabs
  const listRes = await fetch(`${BACKEND_URL}/shipping-slabs`);
  assert(listRes.status === 200, 'GET /shipping-slabs returns HTTP 200');
  const slabs = await listRes.json();
  assert(Array.isArray(slabs) && slabs.length >= 3, `Fetched ${slabs.length} default/active shipping slabs`);

  // 1.2 Create a new slab
  const newSlabData = {
    name: 'Express North Zone Heavy Test',
    minWeight: 2.0,
    maxWeight: 5.0,
    destinationRegion: 'North India',
    rate: 149.0,
    isActive: true,
  };

  const createRes = await fetch(`${BACKEND_URL}/shipping-slabs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSlabData),
  });
  assert(createRes.status === 201, 'POST /shipping-slabs creates a new slab (HTTP 201)');
  const createdSlab = await createRes.json();
  assert(createdSlab && createdSlab.id, `Created slab received ID: ${createdSlab.id}`);
  assert(createdSlab.rate === 149.0, 'Created slab rate matches ₹149');

  // 1.3 Update slab rate
  const updateRes = await fetch(`${BACKEND_URL}/shipping-slabs/${createdSlab.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rate: 169.0, name: 'Express North Zone Heavy (Updated)' }),
  });
  assert(updateRes.status === 200, 'PATCH /shipping-slabs/:id updates slab (HTTP 200)');
  const updatedSlab = await updateRes.json();
  assert(updatedSlab.rate === 169.0, 'Updated slab rate correctly set to ₹169');

  // 1.4 Toggle status
  const toggleRes = await fetch(`${BACKEND_URL}/shipping-slabs/${createdSlab.id}/toggle`, {
    method: 'PATCH',
  });
  assert(toggleRes.status === 200, 'PATCH /shipping-slabs/:id/toggle toggles slab active status');
  const toggledSlab = await toggleRes.json();
  assert(toggledSlab.isActive === false, 'Toggled slab isActive is now false');

  // 1.5 Delete created test slab
  const deleteRes = await fetch(`${BACKEND_URL}/shipping-slabs/${createdSlab.id}`, {
    method: 'DELETE',
  });
  assert(deleteRes.status === 200, 'DELETE /shipping-slabs/:id deletes slab (HTTP 200)');


  console.log('\n===============================================================');
  console.log(' SUITE 2: Dynamic Shipping Rate Calculation Engine');
  console.log('===============================================================');

  // 2.1 Calculate North India light package (<0.5 kg)
  const calc1Res = await fetch(`${BACKEND_URL}/shipping-slabs/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight: 0.35,
      destinationRegion: 'North India',
      orderSubtotal: 350,
    }),
  });
  assert(calc1Res.status === 200, 'POST /shipping-slabs/calculate returns HTTP 200 for North India light parcel');
  const calc1 = await calc1Res.json();
  assert(calc1.shippingFee === 49, `North India light parcel fee is ₹49 (received: ₹${calc1.shippingFee})`);
  assert(calc1.isFree === false, 'isFree flag is false for subtotal < ₹499');

  // 2.2 Calculate National medium package (0.8 kg)
  const calc2Res = await fetch(`${BACKEND_URL}/shipping-slabs/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight: 0.85,
      destinationRegion: 'National',
      orderSubtotal: 299,
    }),
  });
  assert(calc2Res.status === 200, 'POST /shipping-slabs/calculate returns HTTP 200 for National medium parcel');
  const calc2 = await calc2Res.json();
  assert(calc2.shippingFee === 79, `National medium parcel fee matches slab rate ₹79 (received: ₹${calc2.shippingFee})`);

  // 2.3 Free Shipping Threshold (order subtotal >= ₹499)
  const calc3Res = await fetch(`${BACKEND_URL}/shipping-slabs/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight: 1.5,
      destinationRegion: 'South India',
      orderSubtotal: 799,
    }),
  });
  assert(calc3Res.status === 200, 'POST /shipping-slabs/calculate returns HTTP 200 for subtotal >= ₹499');
  const calc3 = await calc3Res.json();
  assert(calc3.shippingFee === 0, `Free shipping applies (₹0 fee, received: ₹${calc3.shippingFee})`);
  assert(calc3.isFree === true, 'isFree flag is true when order subtotal is ₹799');

  // 2.4 Pincode matching (110001 -> North India)
  const calc4Res = await fetch(`${BACKEND_URL}/shipping-slabs/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight: 0.4,
      destinationRegion: '110001',
      orderSubtotal: 250,
    }),
  });
  const calc4 = await calc4Res.json();
  assert(calc4.shippingFee === 49, `Pincode 110001 correctly routes to North India slab (fee: ₹${calc4.shippingFee})`);


  console.log('\n===============================================================');
  console.log(' SUITE 3: Tax Invoice & Logistics Shipping Label Generation');
  console.log('===============================================================');

  // 3.1 Fetch orders
  const ordersRes = await fetch(`${BACKEND_URL}/orders`);
  assert(ordersRes.status === 200, 'GET /orders returns HTTP 200');
  const orders = await ordersRes.json();
  assert(Array.isArray(orders) && orders.length > 0, `Found ${orders.length} orders for fulfillment documents`);

  const sampleOrderId = orders[0].id;

  // 3.2 Order Tax Invoice HTML
  const invoiceRes = await fetch(`${BACKEND_URL}/orders/${sampleOrderId}/invoice`);
  assert(invoiceRes.status === 200, `GET /orders/${sampleOrderId}/invoice returns HTTP 200`);
  const invoiceHtml = await invoiceRes.text();
  assert(invoiceHtml.toLowerCase().includes('tax invoice'), 'Invoice HTML contains "Tax Invoice" header');
  assert(invoiceHtml.includes('INV-2026-'), 'Invoice HTML contains valid Invoice Number format');
  assert(invoiceHtml.includes('GSTIN:'), 'Invoice HTML contains Seller GSTIN');
  assert(invoiceHtml.toLowerCase().includes('bill to'), 'Invoice HTML contains Buyer "Bill To" section');
  assert(invoiceHtml.includes('window.print()'), 'Invoice HTML contains print-ready script trigger');

  // 3.3 Logistics Shipping Label HTML
  const labelRes = await fetch(`${BACKEND_URL}/orders/${sampleOrderId}/shipping-label`);
  assert(labelRes.status === 200, `GET /orders/${sampleOrderId}/shipping-label returns HTTP 200`);
  const labelHtml = await labelRes.text();
  assert(labelHtml.includes('EXPRESS') && labelHtml.includes('LOGISTICS'), 'Shipping Label contains Logistics & Express header');
  assert(labelHtml.includes('AWB:'), 'Shipping Label contains AWB / Tracking barcode section');
  assert(labelHtml.includes('DELIVER TO:'), 'Shipping Label contains Buyer Delivery Address');
  assert(labelHtml.includes('KG'), 'Shipping Label contains Package Weight');
  assert(labelHtml.includes('RETURN TO') || labelHtml.includes('SHIPPED BY'), 'Shipping Label contains Seller Return Address');


  console.log('\n===============================================================');
  console.log(' SUITE 4: Full-Stack Server & Dashboard Health Checks');
  console.log('===============================================================');

  // 4.1 Admin Portal Shipping Slabs Dashboard
  try {
    const adminSlabsRes = await fetch(`${ADMIN_URL}/shipping-slabs`);
    const adminSlabsHtml = await adminSlabsRes.text();
    assert(adminSlabsRes.status === 200, `Admin Portal /shipping-slabs is LIVE (HTTP 200)`);
    assert(adminSlabsHtml.includes('Shipping Slabs'), 'Admin Slabs page contains "Shipping Slabs" title');
  } catch (err) {
    assert(false, `Admin Portal /shipping-slabs error: ${err.message}`);
  }

  // 4.2 Admin Portal Orders & Invoices Dashboard
  try {
    const adminOrdersRes = await fetch(`${ADMIN_URL}/orders`);
    const adminOrdersHtml = await adminOrdersRes.text();
    assert(adminOrdersRes.status === 200, `Admin Portal /orders is LIVE (HTTP 200)`);
    assert(adminOrdersHtml.includes('Orders, Invoices'), 'Admin Orders page contains "Orders, Invoices" title');
  } catch (err) {
    assert(false, `Admin Portal /orders error: ${err.message}`);
  }

  // 4.3 Customer Storefront Checkout
  try {
    const checkoutRes = await fetch(`${STOREFRONT_URL}/checkout`);
    assert(checkoutRes.status === 200, `Customer Storefront /checkout is LIVE (HTTP 200)`);
  } catch (err) {
    assert(false, `Customer Storefront /checkout error: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
