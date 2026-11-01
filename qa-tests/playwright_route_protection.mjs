import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = 'http://localhost:5000';
const STOREFRONT_URL = 'http://localhost:3000';
const ADMIN_URL = 'http://localhost:3001';

async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function runRouteProtectionTests() {
  console.log('=== STARTING PLAYWRIGHT ROUTE PROTECTION & REDIRECT TESTS ===');
  const browser = await chromium.launch({ headless: true });

  const adminAuth = await login('admin@sridattam.com', 'password123');
  const editorAuth = await login('editor@sridattam.com', 'password123');
  const readOnlyAuth = await login('read_only@sridattam.com', 'password123');
  const customerAuth = await login('customer@sridattam.com', 'password123');

  const roles = [
    { name: 'Unauthenticated', session: null },
    { name: 'Customer', session: customerAuth },
    { name: 'Read-Only', session: readOnlyAuth },
    { name: 'Editor', session: editorAuth },
    { name: 'Admin', session: adminAuth },
  ];

  const adminRoutes = [
    '/overview',
    '/orders',
    '/payments',
    '/shipping',
    '/products',
    '/products/new',
    '/categories',
    '/clubbings',
    '/discounts',
    '/reviews',
    '/customers',
    '/accounting',
    '/users',
    '/company-profile',
    '/email',
    '/site-status',
    '/audit-logs',
    '/invoices-labels',
  ];

  const storefrontRoutes = [
    '/',
    '/products',
    '/cart',
    '/checkout',
    '/track-order',
    '/about',
    '/contact',
    '/privacy-policy',
    '/login',
    '/admin',
    '/staff/clubbings',
    '/account',
    '/register',
    '/maintenance',
  ];

  const findings = [];
  const results = [];

  // 1. ADMIN PORTAL ROUTE PROTECTION
  console.log('\n--- 1. Testing Admin Portal Direct URL Navigation across All Roles ---');
  for (const role of roles) {
    console.log(`\nTesting role: ${role.name}...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set localStorage auth_session if role is authenticated
    if (role.session) {
      await page.goto(`${ADMIN_URL}/login`);
      await page.evaluate((sess) => {
        const payload = {
          token: sess.access_token,
          access_token: sess.access_token,
          refresh_token: sess.refresh_token,
          user: sess.user,
        };
        localStorage.setItem('auth_session', JSON.stringify(payload));
        localStorage.setItem('admin_token', sess.access_token);
      }, role.session);
    }

    for (const route of adminRoutes) {
      const fullUrl = `${ADMIN_URL}${route}`;
      let finalUrl = '';
      let redirected = false;
      const consoleErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      try {
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000); // Wait for role check redirect
        finalUrl = page.url();
        redirected = finalUrl !== fullUrl;

        // Check if unauthenticated accessed protected page
        if (!role.session && !finalUrl.includes('/login')) {
          findings.push({
            id: 'ADMIN-PORTAL-AUTH-BYPASS',
            severity: 'Critical',
            area: 'Admin Portal Route Protection',
            title: `Unauthenticated access permitted on direct navigation to ${route}`,
            evidence: `Navigated to ${fullUrl}, remained at ${finalUrl}`,
          });
        }

        // Check if customer accessed admin portal
        if (role.name === 'Customer' && !finalUrl.includes('/login')) {
          findings.push({
            id: 'CUSTOMER-ACCESS-ADMIN-PORTAL',
            severity: 'Critical',
            area: 'Admin Portal RBAC',
            title: `Customer role permitted access to ${route} without redirect to login`,
            evidence: `Navigated to ${fullUrl}, ended at ${finalUrl}`,
          });
        }

        // Check if Read-Only accessed restricted admin routes
        const readOnlyBlocked = ['/overview', '/shipping', '/products', '/categories', '/clubbings', '/discounts', '/reviews', '/customers', '/accounting', '/users', '/company-profile', '/email', '/site-status', '/audit-logs'];
        if (role.name === 'Read-Only' && readOnlyBlocked.includes(route) && finalUrl.endsWith(route)) {
          findings.push({
            id: 'READONLY-RBAC-BYPASS-FRONTEND',
            severity: 'High',
            area: 'Admin Portal RBAC',
            title: `Read-Only staff member accessed restricted route ${route}`,
            evidence: `Navigated to ${fullUrl}, allowed at ${finalUrl}`,
          });
        }

        results.push({
          app: 'Admin Portal',
          role: role.name,
          route,
          finalUrl: finalUrl.replace(ADMIN_URL, ''),
          redirected,
          errorsCount: consoleErrors.length,
        });
      } catch (err) {
        results.push({
          app: 'Admin Portal',
          role: role.name,
          route,
          finalUrl: 'FAILED_TIMEOUT',
          error: err.message,
        });
      }
    }
    await context.close();
  }

  // 2. STOREFRONT SPECIAL REDIRECTS (middleware.js validation)
  console.log('\n--- 2. Testing Storefront Middleware Direct URL Redirects ---');
  const sfContext = await browser.newContext();
  const sfPage = await sfContext.newPage();

  for (const route of storefrontRoutes) {
    const fullUrl = `${STOREFRONT_URL}${route}`;
    try {
      await sfPage.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sfPage.waitForTimeout(500);
      const finalUrl = sfPage.url();

      // Check middleware redirects:
      // /admin or /staff -> http://localhost:3001
      if (route === '/admin' || route.startsWith('/staff')) {
        const redirectedToAdmin = finalUrl.includes('3001');
        console.log(`Storefront ${route} -> ${finalUrl} (Admin redirect: ${redirectedToAdmin})`);
        if (!redirectedToAdmin) {
          findings.push({
            id: 'STOREFRONT-ADMIN-REDIRECT-FAIL',
            severity: 'High',
            area: 'Storefront Middleware',
            title: `Storefront ${route} did not redirect to Admin Portal on port 3001`,
            evidence: `Navigated to ${fullUrl}, stayed at ${finalUrl}`,
          });
        }
      }

      // /login -> http://localhost:3001/login
      if (route === '/login') {
        const redirectedToAdminLogin = finalUrl.includes('3001/login');
        console.log(`Storefront /login -> ${finalUrl} (Admin login redirect: ${redirectedToAdminLogin})`);
        if (!redirectedToAdminLogin) {
          findings.push({
            id: 'STOREFRONT-LOGIN-REDIRECT-FAIL',
            severity: 'High',
            area: 'Storefront Middleware',
            title: 'Storefront /login did not redirect to Admin Portal /login',
            evidence: `Navigated to ${fullUrl}, ended at ${finalUrl}`,
          });
        }
      }

      // /account or /register -> /
      if (route === '/account' || route === '/register') {
        const redirectedToHome = finalUrl === `${STOREFRONT_URL}/` || finalUrl === STOREFRONT_URL;
        console.log(`Storefront ${route} -> ${finalUrl} (Home redirect: ${redirectedToHome})`);
        if (!redirectedToHome) {
          findings.push({
            id: 'STOREFRONT-ACCOUNT-REDIRECT-FAIL',
            severity: 'Medium',
            area: 'Storefront Middleware',
            title: `Storefront ${route} did not redirect to home page`,
            evidence: `Navigated to ${fullUrl}, ended at ${finalUrl}`,
          });
        }
      }

      results.push({
        app: 'Storefront',
        role: 'Unauthenticated',
        route,
        finalUrl: finalUrl.replace(STOREFRONT_URL, ''),
        redirected: finalUrl !== fullUrl,
      });
    } catch (err) {
      results.push({
        app: 'Storefront',
        role: 'Unauthenticated',
        route,
        error: err.message,
      });
    }
  }
  await sfContext.close();

  await browser.close();

  console.log('\n=== ROUTE PROTECTION RESULTS SUMMARY ===');
  console.log(`Total Route Checks: ${results.length}`);
  console.log(`Findings: ${findings.length}`);
  if (findings.length > 0) {
    console.log('Findings:', JSON.stringify(findings, null, 2));
  } else {
    console.log('All route protection checks and middleware redirects PASSED perfectly!');
  }
}

runRouteProtectionTests().catch(console.error);
