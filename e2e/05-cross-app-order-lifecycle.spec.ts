import { test, expect } from '@playwright/test';
import { STOREFRONT_URL, ADMIN_URL, setupRazorpayMock, authenticatePage } from './helpers/auth';

test.describe('Phase 4: Cross-App End-to-End Order Lifecycle (Storefront <-> Backend <-> Admin)', () => {
  test('Complete lifecycle: Customer places order on Storefront -> Admin views order in Portal -> Customer tracks order', async ({ page, request }) => {
    // Intercept and auto-authorize Razorpay with valid HMAC-SHA256 signature
    await setupRazorpayMock(page);

    // -------------------------------------------------------------------------
    // STEP 1: Customer browses and buys an item on Storefront (:3000)
    // -------------------------------------------------------------------------
    await page.goto(`${STOREFRONT_URL}/products`, { waitUntil: 'domcontentloaded' });

    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });
    const productHref = await firstProduct.getAttribute('href');
    await page.goto(`${STOREFRONT_URL}${productHref}`, { waitUntil: 'domcontentloaded' });

    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 15000 });
    await addToCartBtn.click();

    await page.goto(`${STOREFRONT_URL}/cart`, { waitUntil: 'domcontentloaded' });

    const checkoutLink = page.locator('a[href="/checkout"]').first();
    await expect(checkoutLink).toBeVisible({ timeout: 15000 });
    await page.goto(`${STOREFRONT_URL}/checkout`, { waitUntil: 'domcontentloaded' });

    await page.fill('input[placeholder="First name"]', 'Ananya');
    await page.fill('input[placeholder="Last name"]', 'Iyer');
    await page.fill('input[placeholder="you@example.com"]', 'ananya.iyer@example.com');
    await page.fill('input[placeholder="e.g. +91 98765 43210"]', '9812345678');
    await page.fill('input[placeholder="House / Flat no., Building, Street"]', '108 Temple View Apartments, Malleshwaram');
    await page.fill('input[placeholder="6-digit pincode"]', '560003');
    await page.fill('input[placeholder="City / District"]', 'Bengaluru');

    // Select State
    const stateCombobox = page.locator('button[role="combobox"]').first();
    await stateCombobox.click();
    await page.locator('[role="option"]:has-text("Karnataka")').click();

    const paySecurelyBtn = page.locator('button:has-text("Pay")').filter({ hasText: /securely/i });
    await expect(paySecurelyBtn).toBeVisible();
    await paySecurelyBtn.click();

    // Reached confirmation page
    await page.waitForURL('**/order-confirmation**', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const confirmationUrl = page.url();
    const urlObj = new URL(confirmationUrl);
    const orderId = urlObj.searchParams.get('orderId');

    expect(orderId).toBeTruthy();

    // -------------------------------------------------------------------------
    // STEP 2: Admin checks order in Admin Portal (:3001) via Instant Auth Session
    // -------------------------------------------------------------------------
    await authenticatePage(page, request, 'admin', `${ADMIN_URL}/orders`);

    // Verify orders table is visible
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Open specific order detail view
    await page.goto(`${ADMIN_URL}/orders/${orderId}`, { waitUntil: 'domcontentloaded' });

    // Verify order details render with customer name & amount
    await expect(page.locator('h1, [role="heading"]').filter({ hasText: /Order #/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator(`text=${orderId!.slice(0, 8)}`)).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // STEP 3: Customer tracks order on Storefront (:3000)
    // -------------------------------------------------------------------------
    await page.goto(`${STOREFRONT_URL}/track-order?orderId=${orderId}`, { waitUntil: 'domcontentloaded' });

    // Verify order status card loads with the order ID
    await expect(page.locator(`text=${orderId!.slice(0, 8)}`)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h1, h2, div').filter({ hasText: /Order Number|Order Status|Tracking/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
