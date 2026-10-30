import { test, expect } from '@playwright/test';
import { ADMIN_URL, USER_CREDENTIALS } from './helpers/auth';

test.describe('Phase 3: Admin Operations & Catalog Management', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await page.goto(`${ADMIN_URL}/login`);
    await page.fill('#email', USER_CREDENTIALS.admin.email);
    await page.fill('#password', USER_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview', { timeout: 15000 });
  });

  test('1. Admin can view products list and access Add Product screen', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/products`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h2:has-text("Products")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Verify Add Product button is present
    const addProductBtn = page.locator('a[href="/products/new"]').first();
    await expect(addProductBtn).toBeVisible();
    await addProductBtn.click();

    // Verify navigation to new product form
    await page.waitForURL('**/products/new', { timeout: 15000 });
    await expect(page.locator('h1, h2, h3').filter({ hasText: /new product|create product|add product/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('2. Admin can view categories catalog and management interface', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/categories`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h2, h1').filter({ hasText: /categories/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table, .grid, [role="table"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('3. Admin can view and manage discounts and promo coupons', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/discounts`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h2, h1').filter({ hasText: /discounts|coupons/i }).first()).toBeVisible({ timeout: 15000 });
  });

  test('4. Admin can view product reviews moderation table', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/reviews`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h2, h1').filter({ hasText: /reviews/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
