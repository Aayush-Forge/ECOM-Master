import { test, expect } from '@playwright/test';
import { STOREFRONT_URL, setupRazorpayMock } from './helpers/auth';

test.describe('Phase 2B: Storefront Cart, Checkout & Order Placement', () => {
  test('Customer can add item to cart, proceed to checkout, and complete order via test payment gateway', async ({ page }) => {
    // Intercept and auto-authorize Razorpay with valid HMAC-SHA256 signature
    await setupRazorpayMock(page);

    // 1. Browse to products
    await page.goto(`${STOREFRONT_URL}/products`, { waitUntil: 'domcontentloaded' });

    // 2. Select first product and go to PDP
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });
    const productHref = await firstProduct.getAttribute('href');
    await page.goto(`${STOREFRONT_URL}${productHref}`, { waitUntil: 'domcontentloaded' });

    // 3. Add to cart
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 15000 });
    await addToCartBtn.click();

    // 4. Navigate to /cart
    await page.goto(`${STOREFRONT_URL}/cart`, { waitUntil: 'domcontentloaded' });

    // Verify cart has item and Proceed to Checkout button is enabled
    const checkoutLink = page.locator('a[href="/checkout"]').first();
    await expect(checkoutLink).toBeVisible({ timeout: 15000 });
    await page.goto(`${STOREFRONT_URL}/checkout`, { waitUntil: 'domcontentloaded' });

    // 5. Fill customer shipping details
    await page.fill('input[placeholder="First name"]', 'Rahul');
    await page.fill('input[placeholder="Last name"]', 'Sharma');
    await page.fill('input[placeholder="you@example.com"]', 'customer@sridattam.com');
    await page.fill('input[placeholder="e.g. +91 98765 43210"]', '9876543210');
    await page.fill('input[placeholder="House / Flat no., Building, Street"]', '42 Saffron Street, Indiranagar');
    await page.fill('input[placeholder="6-digit pincode"]', '560001');
    await page.fill('input[placeholder="City / District"]', 'Bengaluru');

    // Select State
    const stateCombobox = page.locator('button[role="combobox"]').first();
    await stateCombobox.click();
    await page.locator('[role="option"]:has-text("Karnataka")').click();

    // Submit order
    const paySecurelyBtn = page.locator('button:has-text("Pay")').filter({ hasText: /securely/i });
    await expect(paySecurelyBtn).toBeVisible();
    await paySecurelyBtn.click();

    // 6. Verify redirect to Order Confirmation page upon authorized payment
    await page.waitForURL('**/order-confirmation**', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await expect(page.locator('h1, h2, div').filter({ hasText: /Order Confirmed|Thank you|confirmed/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
