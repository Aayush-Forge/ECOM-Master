/**
 * Comprehensive Role-Based Routing & Navigation Test Suite
 *
 * Tests the single source of truth (lib/roles.js):
 * 1. Role Landing Destinations (single-hop, no redirect chains)
 * 2. Route Guard Enforcement (getRedirectForRole) for all roles across all route prefixes
 * 3. Editor Role Isolation under /staff/* (BLOCKED from ALL /admin/*)
 * 4. Viewer (read_only) Strict Isolation (Orders & Payments only under /staff/*)
 * 5. Navigation Items Audit: Role × Visible Links × Permitted Destination
 * 6. File-system route existence verification
 */

import {
  ROLES,
  ROLE_RANKS,
  ROLE_LABELS,
  ROLE_HOME_ROUTES,
  ROLE_ALLOWED_ROUTE_PREFIXES,
  VIEWER_ALLOWED_STAFF_ROUTES,
  ROLE_NAV_ITEMS,
  getRedirectForRole,
  hasRole,
  requireRole,
} from '../lib/roles.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('\n===============================================================');
console.log(' SUITE 1: Single-Hop Role Landing Destinations (No Redirects)');
console.log('===============================================================');

assert(ROLE_HOME_ROUTES.admin === '/admin/overview', 'Admin lands directly on /admin/overview');
assert(ROLE_HOME_ROUTES.editor === '/staff/overview', 'Editor lands directly on /staff/overview');
assert(ROLE_HOME_ROUTES.read_only === '/staff/orders', 'Viewer (read_only) lands directly on /staff/orders');
assert(ROLE_HOME_ROUTES.customer === '/account', 'Customer lands directly on /account');

console.log('\n===============================================================');
console.log(' SUITE 2: Route Guard Enforcement (getRedirectForRole)');
console.log('===============================================================');

console.log('\n-- 2A: Unauthenticated User (role = null) --');
assert(getRedirectForRole(null, '/admin/overview') === '/login', 'Unauthenticated redirected to /login from /admin/overview');
assert(getRedirectForRole(null, '/staff/orders') === '/login', 'Unauthenticated redirected to /login from /staff/orders');
assert(getRedirectForRole(null, '/staff/overview') === '/login', 'Unauthenticated redirected to /login from /staff/overview');
assert(getRedirectForRole(null, '/account/orders') === '/login', 'Unauthenticated redirected to /login from /account/orders');

console.log('\n-- 2B: Admin Role (Full Access to /admin) --');
assert(getRedirectForRole('admin', '/admin/overview') === null, 'Admin allowed on /admin/overview');
assert(getRedirectForRole('admin', '/admin/orders') === null, 'Admin allowed on /admin/orders');
assert(getRedirectForRole('admin', '/admin/payments') === null, 'Admin allowed on /admin/payments');
assert(getRedirectForRole('admin', '/admin/products') === null, 'Admin allowed on /admin/products');
assert(getRedirectForRole('admin', '/admin/discounts') === null, 'Admin allowed on /admin/discounts');
assert(getRedirectForRole('admin', '/admin/users') === null, 'Admin allowed on /admin/users');
assert(getRedirectForRole('admin', '/admin/audit-logs') === null, 'Admin allowed on /admin/audit-logs');
assert(getRedirectForRole('admin', '/staff/orders') === '/admin/overview', 'Admin redirected to /admin/overview when accessing /staff/orders');
assert(getRedirectForRole('admin', '/staff/overview') === '/admin/overview', 'Admin redirected to /admin/overview when accessing /staff/overview');

console.log('\n-- 2C: Editor Role (Access to /staff/*, BLOCKED from ALL /admin/*) --');
assert(getRedirectForRole('editor', '/staff/overview') === null, 'Editor allowed on /staff/overview');
assert(getRedirectForRole('editor', '/staff/orders') === null, 'Editor allowed on /staff/orders');
assert(getRedirectForRole('editor', '/staff/payments') === null, 'Editor allowed on /staff/payments');
assert(getRedirectForRole('editor', '/staff/products') === null, 'Editor allowed on /staff/products');
assert(getRedirectForRole('editor', '/staff/products/new') === null, 'Editor allowed on /staff/products/new');
assert(getRedirectForRole('editor', '/staff/discounts') === null, 'Editor allowed on /staff/discounts');
assert(getRedirectForRole('editor', '/staff/discounts/new') === null, 'Editor allowed on /staff/discounts/new');
// Editor strictly blocked from /admin/*
assert(getRedirectForRole('editor', '/admin/overview') === '/staff/overview', 'Editor BLOCKED from /admin/overview (redirects to /staff/overview)');
assert(getRedirectForRole('editor', '/admin/products') === '/staff/overview', 'Editor BLOCKED from /admin/products (redirects to /staff/overview)');
assert(getRedirectForRole('editor', '/admin/orders') === '/staff/overview', 'Editor BLOCKED from /admin/orders (redirects to /staff/overview)');
assert(getRedirectForRole('editor', '/admin/discounts') === '/staff/overview', 'Editor BLOCKED from /admin/discounts (redirects to /staff/overview)');
assert(getRedirectForRole('editor', '/admin/users') === '/staff/overview', 'Editor BLOCKED from /admin/users (redirects to /staff/overview)');
assert(getRedirectForRole('editor', '/admin/audit-logs') === '/staff/overview', 'Editor BLOCKED from /admin/audit-logs (redirects to /staff/overview)');

console.log('\n-- 2D: Viewer Role (read_only: STRICTLY /staff/orders & /staff/payments) --');
assert(getRedirectForRole('read_only', '/staff/orders') === null, 'Viewer allowed on /staff/orders');
assert(getRedirectForRole('read_only', '/staff/payments') === null, 'Viewer allowed on /staff/payments');
assert(getRedirectForRole('read_only', '/staff/overview') === '/staff/orders', 'Viewer BLOCKED from /staff/overview (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/staff/products') === '/staff/orders', 'Viewer BLOCKED from /staff/products (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/staff/discounts') === '/staff/orders', 'Viewer BLOCKED from /staff/discounts (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/admin/overview') === '/staff/orders', 'Viewer BLOCKED from /admin/overview (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/admin/orders') === '/staff/orders', 'Viewer BLOCKED from /admin/orders (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/admin/payments') === '/staff/orders', 'Viewer BLOCKED from /admin/payments (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/admin/products') === '/staff/orders', 'Viewer BLOCKED from /admin/products (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/admin/discounts') === '/staff/orders', 'Viewer BLOCKED from /admin/discounts (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/admin/users') === '/staff/orders', 'Viewer BLOCKED from /admin/users (redirects to /staff/orders)');
assert(getRedirectForRole('read_only', '/admin/audit-logs') === '/staff/orders', 'Viewer BLOCKED from /admin/audit-logs (redirects to /staff/orders)');

console.log('\n-- 2E: Customer Role (STRICTLY /account) --');
assert(getRedirectForRole('customer', '/account') === null, 'Customer allowed on /account');
assert(getRedirectForRole('customer', '/account/orders') === null, 'Customer allowed on /account/orders');
assert(getRedirectForRole('customer', '/account/profile') === null, 'Customer allowed on /account/profile');
assert(getRedirectForRole('customer', '/account/addresses') === null, 'Customer allowed on /account/addresses');
assert(getRedirectForRole('customer', '/admin/overview') === '/account', 'Customer BLOCKED from /admin/overview (redirects to /account)');
assert(getRedirectForRole('customer', '/staff/orders') === '/account', 'Customer BLOCKED from /staff/orders (redirects to /account)');
assert(getRedirectForRole('customer', '/staff/overview') === '/account', 'Customer BLOCKED from /staff/overview (redirects to /account)');

console.log('\n===============================================================');
console.log(' SUITE 3: Navigation Audit Table Cross-Referencing');
console.log('===============================================================');

const roles = ['admin', 'editor', 'read_only', 'customer'];

for (const role of roles) {
  const items = ROLE_NAV_ITEMS[role];
  assert(Array.isArray(items) && items.length > 0, `ROLE_NAV_ITEMS[${role}] is defined with ${items?.length} items`);

  console.log(`\n  Nav audit for [${role}] (${ROLE_LABELS[role]}):`);
  for (const item of items) {
    const isAllowed = getRedirectForRole(role, item.href) === null;
    assert(isAllowed, `[${role}] Nav item "${item.label}" (${item.href}) is permitted for this role`);

    // Verify route file exists on disk
    let routeSubpath = item.href.replace(/^\//, '');
    let pagePath = path.join(ROOT, 'app', routeSubpath, 'page.js');
    let exists = fs.existsSync(pagePath);
    assert(exists, `Route file exists on disk: app/${routeSubpath}/page.js`);
  }
}

console.log('\n-- 3B: Negative Navigation Audit (Unauthorized links are ABSENT) --');
const editorHrefs = ROLE_NAV_ITEMS.editor.map(i => i.href);
assert(!editorHrefs.some(h => h.startsWith('/admin')), 'Editor nav contains ZERO /admin/* links');
assert(!editorHrefs.includes('/staff/users'), 'Editor nav does NOT include users');
assert(!editorHrefs.includes('/staff/audit-logs'), 'Editor nav does NOT include audit-logs');

const viewerHrefs = ROLE_NAV_ITEMS.read_only.map(i => i.href);
assert(!viewerHrefs.some(h => h.startsWith('/admin')), 'Viewer nav contains ZERO /admin/* links');
assert(!viewerHrefs.includes('/staff/overview'), 'Viewer nav does NOT include dashboard/overview');
assert(!viewerHrefs.includes('/staff/products'), 'Viewer nav does NOT include products');
assert(!viewerHrefs.includes('/staff/discounts'), 'Viewer nav does NOT include discounts');

const customerHrefs = ROLE_NAV_ITEMS.customer.map(i => i.href);
assert(!customerHrefs.some(h => h.startsWith('/admin')), 'Customer nav contains ZERO /admin/* links');
assert(!customerHrefs.some(h => h.startsWith('/staff')), 'Customer nav contains ZERO /staff/* links');

console.log('\n===============================================================');
console.log(` TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
console.log('===============================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
