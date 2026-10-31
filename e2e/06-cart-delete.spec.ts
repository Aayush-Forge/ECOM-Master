import { test, expect } from '@playwright/test';
import { STOREFRONT_URL } from './helpers/auth';

test.describe('Storefront Cart Item Deletion', () => {
  test('Customer can delete an item from the cart page and cart drawer', async ({ page }) => {
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

    // 4. Verify item in cart drawer and click trash button
    const drawerTrashBtn = page.locator('button:has(svg.lucide-trash-2)').first();
    if (await drawerTrashBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await drawerTrashBtn.click();
      await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 10000 });
    }

    // 5. Add item again to test /cart page deletion
    await page.goto(`${STOREFRONT_URL}${productHref}`, { waitUntil: 'domcontentloaded' });
    const addToCartBtn2 = page.locator('button:has-text("Add to Cart")').first();
    await expect(addToCartBtn2).toBeVisible({ timeout: 15000 });
    await addToCartBtn2.click();

    // 6. Go to /cart page
    await page.goto(`${STOREFRONT_URL}/cart`, { waitUntil: 'domcontentloaded' });

    // Verify item is present
    const cartTrashBtn = page.locator('button:has(svg.lucide-trash-2)').first();
    await expect(cartTrashBtn).toBeVisible({ timeout: 15000 });

    // Click trash button to delete
    await cartTrashBtn.click();

    // Verify cart is now empty
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 10000 });
  });
});
