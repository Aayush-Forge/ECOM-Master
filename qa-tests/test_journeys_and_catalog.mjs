const BACKEND_URL = 'http://localhost:5000';

async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function runJourneysAndCatalogTests() {
  console.log('=== RUNNING CATALOG REFLECTION, CYCLES & COUPONS TESTS ===');
  const adminAuth = await login('admin@sridattam.com', 'password123');
  const findings = [];

  // 1. ADMIN PRODUCT LIFECYCLE REFLECTED ON STOREFRONT
  console.log('\n[TEST 1] Admin Product Lifecycle -> Storefront Catalog Reflection');
  const catRes = await fetch(`${BACKEND_URL}/categories`);
  const categories = await catRes.json();
  const categoryId = categories[0]?.id;

  const uniqueSlug = `catalog-test-${Date.now()}`;
  console.log('Creating new product via Admin API...');
  const createProdRes = await fetch(`${BACKEND_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.access_token}`,
    },
    body: JSON.stringify({
      title: 'E2E Lifecycle Test Incense',
      slug: uniqueSlug,
      basePrice: 299,
      stockQuantity: 50,
      status: 'published',
      categoryId,
    }),
  });
  const createdProd = await createProdRes.json();
  console.log('Product created in DB:', createdProd.id, 'Status:', createdProd.status);

  // Check storefront catalog
  const sfCatalogRes = await fetch(`${BACKEND_URL}/products?search=${uniqueSlug}`);
  const sfCatalogData = await sfCatalogRes.json();
  const foundOnSf = (sfCatalogData.products || sfCatalogData.data || []).some((p) => p.slug === uniqueSlug);
  console.log('Found on storefront catalog:', foundOnSf);
  if (!foundOnSf) {
    findings.push({
      id: 'STOREFRONT-CATALOG-SYNC-FAIL',
      severity: 'High',
      area: 'Catalog',
      title: 'Published product not visible on storefront catalog',
      evidence: `Search for ${uniqueSlug} returned 0 results on /products`,
    });
  }

  // Admin updates price
  console.log('Updating product price to 399...');
  await fetch(`${BACKEND_URL}/products/${createdProd.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.access_token}`,
    },
    body: JSON.stringify({ basePrice: 399 }),
  });

  const updatedSfRes = await fetch(`${BACKEND_URL}/products/${uniqueSlug}`);
  const updatedSfData = await updatedSfRes.json();
  console.log('Updated price on storefront:', updatedSfData.price || updatedSfData.basePrice);

  // Admin deletes product
  console.log('Deleting product...');
  await fetch(`${BACKEND_URL}/products/${createdProd.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });

  const deletedSfRes = await fetch(`${BACKEND_URL}/products/${uniqueSlug}`);
  console.log('Storefront fetch for deleted product status:', deletedSfRes.status);
  if (deletedSfRes.status !== 404) {
    findings.push({
      id: 'DELETED-PRODUCT-STILL-VISIBLE',
      severity: 'High',
      area: 'Catalog',
      title: 'Deleted product still accessible on storefront',
      evidence: `GET /products/${uniqueSlug} returned HTTP ${deletedSfRes.status}`,
    });
  }

  // 2. CATEGORY TREE & CYCLE DETECTION
  console.log('\n[TEST 2] Category Cycle Detection');
  // Create Category A
  const catARes = await fetch(`${BACKEND_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.access_token}`,
    },
    body: JSON.stringify({
      name: `Category A ${Date.now()}`,
      slug: `cat-a-${Date.now()}`,
    }),
  });
  const catA = await catARes.json();

  // Create Category B with parent A
  const catBRes = await fetch(`${BACKEND_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.access_token}`,
    },
    body: JSON.stringify({
      name: `Category B ${Date.now()}`,
      slug: `cat-b-${Date.now()}`,
      parentId: catA.id,
    }),
  });
  const catB = await catBRes.json();
  console.log('Created Cat A:', catA.id, 'and Cat B with parent Cat A:', catB.id);

  // Now attempt to update Category A to have parent B (creating circular loop A -> B -> A)
  const cycleRes = await fetch(`${BACKEND_URL}/categories/${catA.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.access_token}`,
    },
    body: JSON.stringify({
      parentId: catB.id,
    }),
  });
  console.log('Circular category update (A parent = B) status:', cycleRes.status);
  const cycleText = await cycleRes.text();
  console.log('Circular update response:', cycleText);

  if (cycleRes.ok) {
    findings.push({
      id: 'CATEGORY-CYCLE-DETECTION-FAIL',
      severity: 'High',
      area: 'Categories',
      title: 'Infinite Loop Risk: Category hierarchy permitted circular loop (A -> B -> A)',
      evidence: `PATCH /categories/${catA.id} with parentId=${catB.id} succeeded: ${cycleText}`,
    });
  } else {
    console.log('PASS: Category cycle detection correctly prevented circular loop.');
  }

  // Clean up test categories
  await fetch(`${BACKEND_URL}/categories/${catB.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });
  await fetch(`${BACKEND_URL}/categories/${catA.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminAuth.access_token}` },
  });

  // 3. COUPONS / DISCOUNTS CREATION & CART APPLICATION
  console.log('\n[TEST 3] Coupons Creation & Cart Validation');
  const couponCode = `TESTDISC${Date.now() % 10000}`;
  const couponRes = await fetch(`${BACKEND_URL}/clubbing-rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminAuth.access_token}`,
    },
    body: JSON.stringify({
      name: 'QA 10% Discount',
      ruleType: 'CART_DISCOUNT',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      code: couponCode,
      isActive: true,
      minCartValue: 50,
      maxDiscountAmount: 100,
    }),
  });
  console.log('Create coupon status:', couponRes.status);
  const couponData = await couponRes.json();
  console.log('Coupon response:', couponData);

  // Create cart and apply coupon
  const cartRes = await fetch(`${BACKEND_URL}/cart`, { method: 'POST' });
  const cart = await cartRes.json();
  console.log('Created cart:', cart.id);

  // Add item to cart
  const realProdRes = await fetch(`${BACKEND_URL}/products?page=1&per_page=1`);
  const realProd = (await realProdRes.json()).products?.[0];
  await fetch(`${BACKEND_URL}/cart/${cart.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cart-token': cart.cartToken },
    body: JSON.stringify({ productId: realProd.id, quantity: 1 }),
  });

  // Fetch cart with coupon
  const cartWithCouponRes = await fetch(`${BACKEND_URL}/cart/${cart.id}?couponCode=${couponCode}`, {
    headers: { 'x-cart-token': cart.cartToken },
  });
  const cartWithCoupon = await cartWithCouponRes.json();
  console.log('Cart with coupon:', {
    subtotal: cartWithCoupon.subtotal,
    discountTotal: cartWithCoupon.discountTotal,
    grandTotal: cartWithCoupon.grandTotal,
    appliedCoupon: cartWithCoupon.appliedCoupon || cartWithCoupon.couponCode,
  });

  // Clean up coupon
  if (couponData.id) {
    await fetch(`${BACKEND_URL}/clubbing-rules/${couponData.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminAuth.access_token}` },
    });
  }

  console.log('\n=== CATALOG & COUPONS FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
}

runJourneysAndCatalogTests().catch(console.error);
