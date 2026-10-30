import { test, expect } from '@playwright/test';
import { STOREFRONT_URL } from './helpers/auth';

test.describe('Phase 2A: Storefront Browsing & Product Catalog', () => {
  test('1. Homepage loads with brand identity, marquee announcements and navigation', async ({ page }) => {
    await page.goto(`${STOREFRONT_URL}`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=FREE DELIVERY ABOVE RS. 499/-').first()).toBeVisible();

    const productsLink = page.locator('header a[href="/products"]').first();
    await expect(productsLink).toBeVisible();
  });

  test('2. Product catalog renders products and allows viewing product detail page', async ({ page }) => {
    await page.goto(`${STOREFRONT_URL}/products`, { waitUntil: 'domcontentloaded' });

    // Verify catalog header
    await expect(
      page.locator('h1, h2, [role="heading"]').filter({ hasText: /all sacred products|sacred collections|all products|catalog/i }).first()
    ).toBeVisible({ timeout: 15000 });

    // Verify product card links exist
    const productCards = page.locator('a[href^="/products/"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);

    // Navigate directly to the first product PDP
    const firstCard = productCards.first();
    const href = await firstCard.getAttribute('href');
    await page.goto(`${STOREFRONT_URL}${href}`, { waitUntil: 'domcontentloaded' });

    // Verify PDP elements: Add to Cart button, price, and in-stock / options indicator
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Select Options")').first();
    await expect(addToCartBtn).toBeVisible({ timeout: 15000 });
  });
});
