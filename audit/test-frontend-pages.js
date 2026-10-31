const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STOREFRONT_BASE = 'http://localhost:3000';
const ADMIN_BASE = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const auditResults = {
  storefront: [],
  adminPortal: [],
  roleRouting: [],
  consoleErrors: []
};

async function runFrontendAudit() {
  console.log('=== STARTING EXTENSIVE FRONTEND & BROWSER AUDIT ===');
  const browser = await chromium.launch({ headless: true });

  // 1. STOREFRONT PUBLIC PAGES AUDIT (Desktop 1440px & Mobile 375px)
  console.log('\n--- 1. AUDITING STOREFRONT PAGES ---');
  const sfPages = [
    { path: '/', name: 'Homepage' },
    { path: '/products', name: 'Product Catalog' },
    { path: '/cart', name: 'Cart' },
    { path: '/checkout', name: 'Checkout' },
    { path: '/clubbing', name: 'Festive / Clubbing Deals' },
    { path: '/about', name: 'About Us' },
    { path: '/contact', name: 'Contact' },
    { path: '/track-order', name: 'Track Order' },
    { path: '/login', name: 'Login Page' },
    { path: '/register', name: 'Register Page' },
    { path: '/terms-conditions', name: 'Terms & Conditions' },
    { path: '/privacy-policy', name: 'Privacy Policy' },
    { path: '/refund-policy', name: 'Refund Policy' },
    { path: '/shipping-policy', name: 'Shipping Policy' },
    // Residual / Admin routes in storefront
    { path: '/admin', name: 'Storefront /admin (Middleware redirect check)' },
    { path: '/admin/accounting', name: 'Storefront /admin/accounting (Leaked Admin Page)' },
    { path: '/admin/clubbings', name: 'Storefront /admin/clubbings (Leaked Admin Page)' },
    { path: '/staff/clubbings', name: 'Storefront /staff/clubbings (Leaked Admin Page)' },
    // Protected customer routes unauthenticated
    { path: '/account', name: 'Storefront /account (Unauth redirect check)' },
    { path: '/account/orders', name: 'Storefront /account/orders (Unauth redirect check)' },
    { path: '/account/profile', name: 'Storefront /account/profile (Unauth redirect check)' },
    { path: '/account/addresses', name: 'Storefront /account/addresses (Unauth redirect check)' },
  ];

  for (const p of sfPages) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    try {
      const res = await page.goto(`${STOREFRONT_BASE}${p.path}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      const status = res ? res.status() : 'No response';
      const safeName = p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const shotPath = path.join(SCREENSHOT_DIR, `sf_${safeName}.png`);
      await page.screenshot({ path: shotPath });

      // Mobile check (375px)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      const mobileShotPath = path.join(SCREENSHOT_DIR, `sf_mobile_${safeName}.png`);
      await page.screenshot({ path: mobileShotPath });

      const record = {
        name: p.name,
        path: p.path,
        status,
        finalUrl: currentUrl,
        errorsCount: errors.length,
        errors: errors.slice(0, 3),
        screenshot: `audit/screenshots/sf_${safeName}.png`,
        mobileScreenshot: `audit/screenshots/sf_mobile_${safeName}.png`
      };
      auditResults.storefront.push(record);
      console.log(`[Storefront] ${p.name.padEnd(45)} | HTTP ${status} | Final: ${currentUrl.replace(STOREFRONT_BASE, '')} | Errors: ${errors.length}`);
    } catch (err) {
      console.error(`[Storefront ERROR] ${p.name}: ${err.message}`);
      auditResults.storefront.push({
        name: p.name,
        path: p.path,
        status: 'CRASH',
        error: err.message
      });
    } finally {
      await page.close();
    }
  }

  // 2. ADMIN PORTAL ROUTE PROTECTION AUDIT (UNAUTHENTICATED)
  console.log('\n--- 2. AUDITING ADMIN PORTAL UNAUTHENTICATED ACCESS ---');
  const adminRoutes = [
    '/overview',
    '/orders',
    '/payments',
    '/shipping',
    '/clubbings',
    '/products',
    '/products/new',
    '/categories',
    '/discounts',
    '/reviews',
    '/customers',
    '/accounting',
    '/users',
    '/company-profile',
    '/email',
    '/audit-logs'
  ];

  for (const route of adminRoutes) {
    const page = await browser.newPage();
    try {
      await page.goto(`${ADMIN_BASE}${route}`, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(1500);
      const finalUrl = page.url();
      const isRedirected = finalUrl.includes('/login');
      auditResults.adminPortal.push({
        route,
        role: 'Unauthenticated',
        finalUrl,
        protected: isRedirected,
        status: isRedirected ? 'PASS (Redirected to /login)' : 'FAIL (Accessed without Auth)'
      });
      console.log(`[Admin Unauth] ${route.padEnd(20)} -> ${isRedirected ? 'PASS (Redirected to /login)' : 'FAIL: ' + finalUrl}`);
    } catch (err) {
      console.error(`[Admin Unauth Error] ${route}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  // 3. ADMIN PORTAL ROLE-BASED ACCESS AUDIT (PER ROLE)
  console.log('\n--- 3. AUDITING ADMIN PORTAL PER ROLE ACCESS ---');
  const staffRoles = [
    { role: 'customer', email: 'customer@sridattam.com', pass: 'password123' },
    { role: 'read_only', email: 'read_only@sridattam.com', pass: 'password123' },
    { role: 'editor', email: 'editor@sridattam.com', pass: 'password123' },
    { role: 'admin', email: 'admin@sridattam.com', pass: 'password123' },
  ];

  for (const st of staffRoles) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login via API and populate localStorage auth_session
    const loginRes = await page.request.post('http://localhost:5000/auth/login', {
      data: { email: st.email, password: st.pass }
    });
    const loginJson = await loginRes.json();
    const token = loginJson.access_token;
    const user = loginJson.user;

    // Navigate to admin portal and set auth_session in localStorage
    await page.goto(`${ADMIN_BASE}/login`);
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('auth_session', JSON.stringify({
        token,
        user
      }));
    }, { token, user });

    console.log(`\nTesting permissions for Role: ${st.role.toUpperCase()} (${st.email})`);

    for (const route of adminRoutes) {
      try {
        await page.goto(`${ADMIN_BASE}${route}`, { waitUntil: 'load', timeout: 10000 });
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        const pathPart = currentUrl.replace(ADMIN_BASE, '');

        let expectedAccess = false;
        if (st.role === 'admin') expectedAccess = true;
        if (st.role === 'editor') {
          // Editor allowed: overview, orders, payments, clubbings, products, categories, discounts, reviews
          expectedAccess = ['/overview', '/orders', '/payments', '/clubbings', '/products', '/categories', '/discounts', '/reviews'].some(r => route.startsWith(r));
        }
        if (st.role === 'read_only') {
          expectedAccess = ['/orders', '/payments'].some(r => route.startsWith(r));
        }
        if (st.role === 'customer') {
          expectedAccess = false; // Customers must be kicked to /login?error=unauthorized
        }

        const actuallyAllowed = !pathPart.includes('/login') && (route === '/overview' ? pathPart === '/overview' : pathPart.startsWith(route));
        const matchesExpectation = expectedAccess ? actuallyAllowed : !actuallyAllowed;

        auditResults.roleRouting.push({
          role: st.role,
          route,
          expectedAccess,
          actuallyAllowed,
          finalUrl: pathPart,
          verdict: matchesExpectation ? 'PASS' : 'FAIL'
        });

        const icon = matchesExpectation ? '✅' : '❌';
        console.log(`  ${icon} [${st.role}] ${route.padEnd(20)} | Expected: ${expectedAccess ? 'ALLOW' : 'DENY'} | Actual: ${actuallyAllowed ? 'ALLOWED' : 'DENIED (' + pathPart + ')'}`);
      } catch (e) {
        console.error(`  Error on ${st.role} -> ${route}: ${e.message}`);
      }
    }

    await context.close();
  }

  await browser.close();

  fs.writeFileSync(path.join(__dirname, 'frontend_audit_results.json'), JSON.stringify(auditResults, null, 2));
  console.log('\nFrontend audit completed. Results saved to audit/frontend_audit_results.json');
}

runFrontendAudit().catch(console.error);
