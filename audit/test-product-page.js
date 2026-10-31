const { chromium } = require('@playwright/test');

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3000/products');
    await page.waitForSelector('a[href^="/products/"]', { timeout: 10000 });
    const count = await page.locator('a[href^="/products/"]').count();
    console.log('Product cards found after waiting:', count);
  } catch (err) {
    console.error('Wait failed:', err.message);
  } finally {
    await browser.close();
  }
}

check();
