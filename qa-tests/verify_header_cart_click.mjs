import { chromium } from 'playwright';

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:3000';

async function verifyCartClick() {
  console.log('--- VERIFYING HEADER CART BUTTON CLICK (375px and 1440px) ---');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];

  let allPassed = true;

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
    });

    try {
      await page.goto(STOREFRONT_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Locate the Open cart button in header
      const cartButton = page.locator('header button[aria-label="Open cart"]');
      const isVisible = await cartButton.isVisible();
      console.log(`Cart button is visible: ${isVisible}`);

      if (!isVisible) {
        console.error(`FAIL: Cart button not visible at ${vp.name}`);
        allPassed = false;
        continue;
      }

      // Normal click without force: true
      await cartButton.click({ timeout: 5000 });
      console.log('Clicked cart button successfully without force');

      // Verify cart drawer is opened
      await page.waitForTimeout(500);
      const drawer = page.locator('[role="dialog"], [data-state="open"], .sheet-content').first();
      const isDrawerOpen = await drawer.isVisible();
      console.log(`Cart drawer opened: ${isDrawerOpen}`);

      if (!isDrawerOpen) {
        console.error(`FAIL: Cart drawer failed to open at ${vp.name}`);
        allPassed = false;
      } else {
        console.log(`PASS: Header cart click verified at ${vp.name}`);
      }

      // Close the drawer if open
      const closeBtn = page.locator('button[aria-label="Close"], button:has(svg.lucide-x)').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }

      // Test clicking after scrolling through the brand story section
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      await cartButton.click({ timeout: 5000 });
      console.log(`Clicked cart button successfully after scroll at ${vp.name}`);
    } catch (err) {
      console.error(`FAIL: Exception during test at ${vp.name}:`, err.message);
      allPassed = false;
    } finally {
      await page.close();
    }
  }

  await browser.close();

  if (!allPassed) {
    console.error('\nHeader cart click verification FAILED!');
    process.exit(1);
  } else {
    console.log('\nAll viewports passed header cart click test!');
  }
}

verifyCartClick().catch((err) => {
  console.error(err);
  process.exit(1);
});
