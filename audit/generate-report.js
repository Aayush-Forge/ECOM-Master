const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json'), 'utf8'));
const backendResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend_test_results.json'), 'utf8'));
const businessResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'business_logic_results.json'), 'utf8'));
const frontendResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'frontend_audit_results.json'), 'utf8'));
const loadResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'load_test_results.json'), 'utf8'));

let report = `# FULL EVIDENCE-BASED AUDIT REPORT
**Platform:** Sridattam E-Commerce Monorepo (Next.js 14 Storefront + NestJS 11 Backend + Next.js Admin Portal + PostgreSQL 15 + Redis 7 + Razorpay)  
**Date of Audit:** October 31, 2026  
**Auditor:** Senior QA & Security Auditor  
**Audit Mode:** Audit Only (Zero application code modified)  
**Readiness Verdict:** 🛑 **NO-GO FOR PRODUCTION** (Critical Broken Access Control & Financial Ledger Exposure)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Overall Readiness Verdict: 🛑 NO-GO
While core payment HMAC verification, server-authoritative checkout calculation, database constraints, and state-machine transitions operate robustly, the platform **MUST NOT BE DEPLOYED TO PRODUCTION** in its current state. Multiple severe security vulnerabilities expose complete customer PII, full order histories, invoices, and the business's entire financial accounting ledger without any authentication.

### 1.2 Findings Summary by Severity
| Severity | Count | Primary Impact |
| :--- | :---: | :--- |
| 🔴 **Critical** | 3 | Complete PII leak (\`GET /orders\`), Financial ledger leak (\`GET /admin/accounting/export-csv\`), Public Invoice/Label exposure |
| 🟠 **High** | 3 | Staff Editor locked out of shipping module; 5 failed unit test suites (27 tests); Critical dependency CVEs (Next.js, Handlebars, Proxy-Addr) |
| 🟡 **Medium** | 3 | Redundant 404 network fetch on storefront catalog; Storefront residual admin pages; 20,961 ESLint/formatting errors |
| 🟢 **Low / Info** | 2 | Dual Prisma migrations directories; Test secrets in gitignored local env |
| **Total Findings** | **11** | **3 Critical, 3 High, 3 Medium, 2 Low** |

### 1.3 Top 10 Risks
1. **Critical PII & Order History Exposure (\`GET /orders\`)**: Unauthenticated internet users can download all 61+ customer orders, including full customer names, phone numbers, delivery addresses, items purchased, and transaction amounts.
2. **Financial Ledger & Tax Leak (\`GET /admin/accounting/export-csv\`)**: Unauthenticated visitors can download the entire company financial ledger as a CSV containing sales, GST breakdowns, customer emails, and payment references.
3. **Public Tax Invoice & Shipping Label Access**: Order invoices (\`GET /orders/:id/invoice\`) and shipping labels (\`GET /orders/:id/shipping-label\`) are decorated with \`@Public()\`, allowing direct retrieval of private invoices and company banking details.
4. **Staff Editor Locked Out of Shipping (\`admin-portal/lib/roles.js\`)**: Editor navbar presents "Shipping", but router kicks editors back to \`/overview\` due to missing route prefix permission.
5. **Core Unit Test Suite Degradation**: 5 unit test suites failed (27 tests failed), including R2 MIME/size validation and mock payment signature verification.
6. **Critical Dependency Vulnerabilities**: Next.js 14.2.3 and 16.3.4 carry multiple high/critical CVEs for image optimization cache poisoning and SSRF; Handlebars and proxy-addr have known injection/spoofing flaws.
7. **Storefront Catalog Double-Fetch Lag**: \`app/products/page.js\` makes an initial request to non-existent \`/api/products\` before failing over to the backend, causing latency on catalog navigation.
8. **Residual Admin Routes in Storefront**: Storefront contains residual pages (\`/admin/accounting\`, \`/admin/clubbings\`, \`/staff/clubbings\`) that bypass root middleware regex matching.
9. **Dual Migration Directories**: Two folders (\`backend/prisma/migrations\` and \`backend/src/prisma/migrations\`) contain disjoint migrations, creating schema drift risks on fresh deploys.
10. **ESLint Formatting Debt**: 20,961 problems reported by eslint in backend due to Windows CRLF vs LF line endings and strict prettier rules.

---

## 2. COVERAGE MATRIX (EVERY INVENTORY ITEM)

### 2.1 Backend Route Coverage (Sample Representation of 128 Endpoints)
| Endpoint | Method | Expected Role | Tested Role / Vector | Result | Evidence / Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| \`/health\` | GET | Public | Unauth, Expired, All Roles | **PASS** | HTTP 200, db: up |
| \`/products\` | GET | Public | Unauth, ?admin=true | **PASS** | HTTP 200, draft leak mitigated |
| \`/categories\` | GET | Public | Unauth, All Roles | **PASS** | HTTP 200 |
| \`/orders\` | GET | **Customer/Staff** | Unauthenticated | 🔴 **FAIL** | **HTTP 200: Publicly leaks all orders & customer PII** |
| \`/orders/:id/invoice\` | GET | Customer/Staff | Unauthenticated | 🔴 **FAIL** | **HTTP 200: Publicly returns Tax Invoice with banking info** |
| \`/orders/:id/shipping-label\` | GET | Customer/Staff | Unauthenticated | 🔴 **FAIL** | **HTTP 200: Publicly returns shipping courier label** |
| \`/admin/orders\` | GET | Read-Only | Unauth, Expired, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 200, Admin: 200 |
| \`/admin/payments\` | GET | Read-Only | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 200, Signature excluded |
| \`/admin/users\` | GET | Admin | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 403, Ed: 403, Admin: 200 |
| \`/audit-logs\` | GET | Admin | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 403, Ed: 403, Admin: 200 |
| \`/admin/company-profile\` | GET | Admin | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 403, Ed: 403, Admin: 200 |
| \`/admin/accounting/summary\` | GET | Read-Only | Unauthenticated | 🔴 **FAIL** | **HTTP 200: Marked @Public(), bypasses authentication** |
| \`/admin/accounting/export-csv\` | GET | Read-Only | Unauthenticated | 🔴 **FAIL** | **HTTP 200: Full financial ledger CSV exported unauthenticated** |
| \`/shipping-templates\` | GET | Read-Only | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 200, Ed: 200, Admin: 200 |
| \`/shipping-templates\` | POST | Editor | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 403, Ed: 400 (validation), Admin: 400 |
| \`/admin/customers\` | GET | Admin | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 403, Ed: 403, Admin: 200 |
| \`/reviews/products-summary\` | GET | Editor | Unauth, Cust, RO, Ed, Admin | **PASS** | Unauth: 401, Cust: 403, RO: 403, Ed: 200, Admin: 200 |
| \`/orders/me\` | GET | Customer | Unauth, Expired, Cust, Admin | **PASS** | Unauth: 401, Cust: 200, Admin: 200 |
| \`/payments/verify\` | POST | Public | Valid/Tampered HMAC | **PASS** | Invalid signature rejected with 400 |
| \`/payments/webhook\` | POST | Public | Valid/Replay/Tampered HMAC | **PASS** | Missing/Invalid sig: 400, Replay: 201 already_processed |

### 2.2 Frontend Route & Interactive Element Coverage
| Page / Route | App | Viewport Tested | Access Matrix Result | Status |
| :--- | :--- | :---: | :---: | :---: |
| \`/\` (Homepage) | Storefront | 1440px / 375px | Public | **PASS** |
| \`/products\` (Catalog) | Storefront | 1440px / 375px | Public (11 products rendered) | **PASS** |
| \`/cart\` | Storefront | 1440px / 375px | Public (Slide-over & Page) | **PASS** |
| \`/checkout\` | Storefront | 1440px / 375px | Redirects to /cart when empty | **PASS** |
| \`/clubbing\` | Storefront | 1440px / 375px | Public | **PASS** |
| \`/about\` | Storefront | 1440px / 375px | Public | **PASS** |
| \`/contact\` | Storefront | 1440px / 375px | Public | **PASS** |
| \`/track-order\` | Storefront | 1440px / 375px | Public | **PASS** |
| \`/login\` & \`/register\` | Storefront | 1440px / 375px | Public | **PASS** |
| \`/account/*\` (4 routes) | Storefront | 1440px / 375px | Unauthenticated redirected to /login | **PASS** |
| \`/admin\` | Storefront | 1440px | Middleware redirected to :3001 | **PASS** |
| \`/admin/accounting\` | Storefront | 1440px | Client redirected to /login | **PASS** |
| \`/admin/clubbings\` | Storefront | 1440px | Client redirected to /login | **PASS** |
| \`/overview\` | Admin Portal | 1440px | Unauth/Cust: Kicked; Ed/Admin: Allowed | **PASS** |
| \`/orders\` | Admin Portal | 1440px | Unauth/Cust: Kicked; RO/Ed/Admin: Allowed | **PASS** |
| \`/payments\` | Admin Portal | 1440px | Unauth/Cust: Kicked; RO/Ed/Admin: Allowed | **PASS** |
| \`/shipping\` | Admin Portal | 1440px | Unauth/Cust: Kicked; Editor: KICKED; Admin: Allowed | 🟠 **FAIL** |
| \`/clubbings\` | Admin Portal | 1440px | Unauth/Cust: Kicked; Ed/Admin: Allowed | **PASS** |
| \`/products\` & \`/new\` | Admin Portal | 1440px | Unauth/Cust: Kicked; Ed/Admin: Allowed | **PASS** |
| \`/categories\` | Admin Portal | 1440px | Unauth/Cust: Kicked; Ed/Admin: Allowed | **PASS** |
| \`/discounts\` | Admin Portal | 1440px | Unauth/Cust: Kicked; Ed/Admin: Allowed | **PASS** |
| \`/reviews\` | Admin Portal | 1440px | Unauth/Cust: Kicked; Ed/Admin: Allowed | **PASS** |
| \`/customers\` | Admin Portal | 1440px | Unauth/Cust/RO/Ed: Kicked; Admin: Allowed | **PASS** |
| \`/accounting\` | Admin Portal | 1440px | Unauth/Cust/RO/Ed: Kicked; Admin: Allowed | **PASS** |
| \`/users\` | Admin Portal | 1440px | Unauth/Cust/RO/Ed: Kicked; Admin: Allowed | **PASS** |
| \`/company-profile\` | Admin Portal | 1440px | Unauth/Cust/RO/Ed: Kicked; Admin: Allowed | **PASS** |
| \`/audit-logs\` | Admin Portal | 1440px | Unauth/Cust/RO/Ed: Kicked; Admin: Allowed | **PASS** |

---

## 3. DETAILED FINDINGS TABLE

### [CRIT-01] Unauthenticated Mass PII & Order History Exposure via \`GET /orders\`
- **Severity:** 🔴 Critical (CVSS 9.1 - Confidentiality High, Impact High)
- **Area:** Backend API / Customer Orders Controller
- **Affected File & Lines:** \`backend/src/orders/customer-orders.controller.ts:27-36\`
- **Description:**  
  The endpoint \`GET /orders\` is decorated with \`@Public()\` and calls \`ordersService.getAllOrders(...)\` directly. It does not enforce any user authentication or ownership filtering.
- **Steps to Reproduce:**
  \`\`\`bash
  curl -s http://localhost:5000/orders
  \`\`\`
- **Expected vs Actual:**
  - *Expected:* HTTP 401 Unauthorized, or filtered to return only the authenticated user's own orders.
  - *Actual:* HTTP 200 OK returning all 61 customer order records, including full names, phone numbers, email addresses, delivery addresses, order numbers, invoice numbers, and payment details.
- **Evidence:** Live HTTP output returning customer records (e.g., Ananya Iyer, Rahul Sharma with phones and physical street addresses).
- **Suggested Fix Direction:**  
  Remove \`@Public()\` and delete this method from \`CustomerOrdersController\`. The staff endpoint already exists safely under \`@Roles(ROLES.READ_ONLY) GET /admin/orders\`, and the customer endpoint exists under \`@Roles(ROLES.CUSTOMER) GET /orders/me\`.

---

### [CRIT-02] Complete Financial Ledger Leak via \`GET /admin/accounting/*\`
- **Severity:** 🔴 Critical (CVSS 9.1 - Financial Confidentiality High)
- **Area:** Backend API / Accounting Module
- **Affected File & Lines:** \`backend/src/accounting/accounting.controller.ts:18-49\`
- **Description:**  
  The accounting endpoints (\`/admin/accounting/summary\`, \`/daily-breakdown\`, \`/orders\`, and \`/export-csv\`) are decorated with BOTH \`@Public()\` AND \`@Roles(ROLES.READ_ONLY)\`. In NestJS guard evaluation, \`JwtAuthGuard\` and \`RolesGuard\` check \`isPublic\` first; if \`isPublic === true\`, they immediately bypass authentication and role checks.
- **Steps to Reproduce:**
  \`\`\`bash
  curl -s http://localhost:5000/admin/accounting/export-csv -o ledger.csv
  \`\`\`
- **Expected vs Actual:**
  - *Expected:* HTTP 401 Unauthorized. Access restricted to Staff Viewer or Admin.
  - *Actual:* HTTP 200 OK returning the complete financial CSV ledger of the company with customer names, emails, payment gateway references, subtotals, GST breakdown, and grand totals.
- **Evidence:** Live CSV export captured with full transaction history without Authorization header.
- **Suggested Fix Direction:**  
  Remove the \`@Public()\` decorator from all endpoints in \`AccountingController\`. Retain \`@Roles(ROLES.READ_ONLY)\`.

---

### [CRIT-03] Public Access to Customer Tax Invoices and Courier Shipping Labels
- **Severity:** 🔴 Critical (CVSS 8.2)
- **Area:** Backend API / Invoicing & Shipping Documents
- **Affected File & Lines:**  
  - \`backend/src/orders/customer-orders.controller.ts:38-48\`  
  - \`backend/src/orders/orders.controller.ts:69-79\`
- **Description:**  
  Both \`GET /orders/:id/invoice\` and \`GET /orders/:id/shipping-label\` are annotated with \`@Public()\`. Anyone who knows or guesses a UUID order ID can view and download the official Tax Invoice (including company bank account number, IFSC code, and customer address) and courier shipping label.
- **Steps to Reproduce:**
  \`\`\`bash
  curl -s http://localhost:5000/orders/527908d3-87a9-424d-a39d-bf266050510c/invoice
  \`\`\`
- **Expected vs Actual:**
  - *Expected:* HTTP 401/403. Invoices must only be accessible by the order owner or staff members.
  - *Actual:* HTTP 200 OK returning full HTML/PDF Tax Invoice \`INV-2026-1162\`.
- **Suggested Fix Direction:**  
  Enforce authentication and verify that \`req.user.userId === order.customerId || hasRole(req.user.role, 'read_only')\`.

---

### [HIGH-01] Admin Portal RBAC Inconsistency: Staff Editor Locked Out of Shipping
- **Severity:** 🟠 High (Operational RBAC Defect)
- **Area:** Admin Portal / Navigation & Role Routing
- **Affected File & Lines:** \`admin-portal/lib/roles.js:57, 72-84\`
- **Description:**  
  \`ROLE_NAV_ITEMS.editor\` includes \`Shipping\` (\`/shipping\`), but \`ROLE_ALLOWED_ROUTE_PREFIXES.editor\` omits \`'/shipping'\`. When an editor clicks "Shipping", \`getRedirectForRole\` detects an unauthorized route and redirects the editor to \`/overview\`.
- **Steps to Reproduce:**
  Log in as \`editor@sridattam.com\` in Admin Portal and navigate to \`http://localhost:3001/shipping\`.
- **Expected vs Actual:**
  - *Expected:* Editor can view and manage shipping templates and zones.
  - *Actual:* Immediate kickback redirect to \`/overview\`.
- **Evidence:** Browser automation evidence: \`[editor] /shipping | Expected: ALLOW | Actual: DENIED (/overview)\`.
- **Suggested Fix Direction:**  
  Add \`'/shipping'\` to \`ROLE_ALLOWED_ROUTE_PREFIXES.editor\` in \`admin-portal/lib/roles.js\`.

---

### [HIGH-02] Broken Unit Test Suite in Storage and Payment Mocking
- **Severity:** 🟠 High (Quality & Test Suite Integrity)
- **Area:** Backend Unit Tests
- **Affected Files:**  
  - \`backend/src/r2/r2.service.spec.ts\`
  - \`backend/src/payments/payments.service.spec.ts\`
  - \`backend/src/cart/cart.service.spec.ts\`
  - \`backend/src/auth/auth.service.spec.ts\`
  - \`backend/src/cart/cart.controller.spec.ts\`
- **Description:**  
  Running \`npm test\` produces 5 failed test suites and 27 failed unit tests. \`R2Service\` was modified to allow PDF files and 10MB sizes, but tests assert 5MB limits and PDF rejection. In \`payments.service.spec.ts\`, mock tests fail HMAC signature validation because \`RAZORPAY_CONFIG\` loads real secrets from \`.env\`.
- **Steps to Reproduce:**
  \`\`\`bash
  cd backend && npm test
  \`\`\`
- **Evidence:** Jest output: \`Test Suites: 5 failed, 32 passed, 37 total. Tests: 27 failed, 232 passed, 259 total.\`
- **Suggested Fix Direction:**  
  Align unit test fixtures and mock \`RAZORPAY_CONFIG\` in payment tests; update R2 test expectations to match current production specifications (10MB limit and PDF support).

---

### [HIGH-03] Critical Dependency CVEs Across Monorepo
- **Severity:** 🟠 High (Supply Chain / Vulnerability Management)
- **Area:** Third-party Dependencies
- **Affected Packages:**  
  - \`next\` (14.2.3 in Storefront; 16.3.4 in Admin Portal)
  - \`handlebars\` (<4.7.9 in Backend)
  - \`proxy-addr\` (2.0.7 in Backend)
  - \`axios\` (1.10.0 - 1.19.0 in Storefront & Admin Portal)
- **Description:**  
  \`npm audit\` identified 12 vulnerabilities in Storefront (1 critical, 8 high), 27 in Backend (2 critical, 7 high), and 5 in Admin Portal (1 critical, 3 high).
- **Suggested Fix Direction:**  
  Upgrade \`next\` in storefront to the latest patched 14.x or 15.x LTS release; update \`proxy-addr\` and \`axios\` across all packages.

---

### [MED-01] Redundant 404 Fetch on Storefront Catalog Navigation
- **Severity:** 🟡 Medium (Performance & Client Telemetry)
- **Area:** Storefront Product Catalog Page
- **Affected File & Lines:** \`app/products/page.js:40-62\`
- **Description:**  
  On every visit to \`/products\`, the client code executes \`fetch('/api/products')\`. Because Next.js does not define an \`/api/products\` route, the request always 404s, triggering a catch-block fallback to \`NEXT_PUBLIC_BACKEND_URL\`. This introduces an unnecessary HTTP round-trip latency and fills browser network logs with 404 errors.
- **Suggested Fix Direction:**  
  Fetch directly from \`process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'\` without the initial \`/api/products\` probe.

---

### [MED-02] Storefront Residual Admin Routes
- **Severity:** 🟡 Medium (Architectural Hygiene)
- **Area:** Storefront App Router
- **Affected Directories:** \`app/admin/accounting\`, \`app/admin/clubbings\`, \`app/staff/clubbings\`
- **Description:**  
  The customer storefront contains residual administrative pages. While they redirect client-side if unauthenticated, they should reside solely in \`admin-portal/\`. Root \`middleware.js\` only matches \`/admin\` and \`/admin/overview\`, failing to catch deep links like \`/admin/accounting\`.
- **Suggested Fix Direction:**  
  Update \`middleware.js\` matcher regex to redirect \`/admin/*\` and \`/staff/*\` to \`http://localhost:3001\`. Remove orphan admin directories from the storefront repository.

---

### [MED-03] Backend ESLint & Prettier Formatting Debt
- **Severity:** 🟡 Medium (Code Quality)
- **Area:** Backend Codebase
- **Description:**  
  \`npm run lint\` reports 20,961 problems (20,864 errors, 97 warnings), predominantly CRLF vs LF line-ending mismatches and missing prettier line wraps.
- **Suggested Fix Direction:**  
  Configure \`.gitattributes\` to normalize line endings and run \`npx prettier --write "src/**/*.ts"\`.

---

### [LOW-01] Dual Prisma Migrations Directories
- **Severity:** 🟢 Low (Operational Drift Risk)
- **Area:** Database Migrations
- **Affected Folders:** \`backend/prisma/migrations\` vs \`backend/src/prisma/migrations\`
- **Description:**  
  Two separate migrations folders exist. \`prisma.config.ts\` specifies \`src/prisma/schema.prisma\`. Running migrations without explicit flags could apply obsolete legacy migrations.
- **Suggested Fix Direction:**  
  Consolidate all active migrations into \`backend/src/prisma/migrations\` and archive or delete \`backend/prisma/migrations\`.

---

## 4. DOCUMENTED VS IMPLEMENTED GAPS & SPEC CONFLICTS

| Item | Documented (README / Spec) | Implemented in Code | Status / Conflict Note |
| :--- | :--- | :--- | :--- |
| **Editor Shipping Access** | README Table: Editor has Catalog & Orders access; Admin Portal has Shipping Editor. | Navbar shows Shipping, but Route Guard blocks it. | **Conflict / Gap**: Editor cannot reach Shipping UI. |
| **Order Listing Security** | README: Global guards enforce JWT + Role checks fail-closed. | \`CustomerOrdersController.getAllOrders()\` is annotated with \`@Public()\`. | **Critical Conflict**: Security architecture violated. |
| **Accounting Privacy** | README: Staff & Admin operations restricted to high ranks. | Accounting controller endpoints have \`@Public()\`. | **Critical Conflict**: Financial data exposed publicly. |
| **Draft Catalog Access** | \`FINAL_REVIEW.md\` reported \`?admin=true\` leaked drafts. | Verified: Tested with \`GET /products?admin=true\`; query without staff auth is ignored. | **Verified Fixed in Backend**. |
| **Payment Signature In API** | \`FINAL_REVIEW.md\` reported \`GET /admin/payments\` leaked signature. | Verified: Tested \`GET /admin/payments\`; \`razorpaySignature\` is excluded from response. | **Verified Fixed in Backend**. |

---

## 5. BUSINESS LOGIC & CALCULATION TEST RESULTS

| Domain | Test Scenario | Input / Vector | Expected Behavior | Actual Executed Result | Verdict |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Cart** | Zero Quantity Add | \`productId\`, \`quantity: 0\` | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| **Cart** | Negative Quantity Add | \`productId\`, \`quantity: -5\` | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| **Cart** | Exceed Stock Quantity | \`productId\`, \`quantity: 999999\` | HTTP 400 / Stock capped | HTTP 400: Exceeds stock | **PASS** |
| **Pricing** | Client Price Tampering | Client submits \`grandTotal: 1\` | Server recalculates from DB | Server stored \`grandTotal: 158\` (119 + 39 ship) | **PASS** |
| **State Machine** | Illegal Reverse Transition | \`paid\` $\\rightarrow$ \`payment_pending\` | HTTP 400 Transition rejected | HTTP 400: Illegal state transition | **PASS** |
| **State Machine** | Role Privilege Escalation | Customer mutating order status | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **Payments** | Webhook HMAC Verification | Missing or invalid signature | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| **Payments** | Webhook Replay Idempotency | Duplicate \`razorpayEventId\` | HTTP 200/201 without re-processing | HTTP 201: \`already_processed\` | **PASS** |
| **Audit Logs** | Log Immutability | \`DELETE /audit-logs/:id\` | HTTP 404 (No route) | HTTP 404 Not Found | **PASS** |

---

## 6. PERFORMANCE & LOAD METRICS

Executed 50 concurrent requests per endpoint (concurrency factor: 10) against running server:

| Endpoint | Total Requests | Successful | Failed | Avg Latency | 50th Percentile (p50) | 95th Percentile (p95) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| \`GET /health\` | 50 | 50 | 0 | **8.0 ms** | 4.0 ms | 35.0 ms |
| \`GET /products\` | 50 | 50 | 0 | **7.6 ms** | 7.0 ms | 11.0 ms |
| \`GET /categories\` | 50 | 50 | 0 | **5.1 ms** | 5.0 ms | 10.0 ms |
| \`GET /company-profile/public\` | 50 | 50 | 0 | **4.6 ms** | 4.0 ms | 6.0 ms |

Latency under load is excellent (all hot read endpoints return under 10ms average).

---

## 7. AUDIT ASSETS & REPRODUCTION SCRIPTS CREATED

All audit scripts, data artifacts, and execution evidence are committed under the \`/audit/\` folder:

- **\`audit/INVENTORY.md\`**: Complete catalog of all 128 backend endpoints, 22 database models, 11 enums, frontend pages, and roles.
- **\`audit/test-backend.js\`**: HTTP auth matrix, JWT security checks, and endpoint scanner.
- **\`audit/test-business-logic.js\`**: Pricing calculations, client tampering defense, state machine integrity, and webhook replay tests.
- **\`audit/test-frontend-pages.js\`**: Playwright crawler testing all pages, responsive mobile viewports, and role routing.
- **\`audit/load-test.js\`**: Concurrency and latency load benchmark.
- **\`audit/scan-secrets.js\`**: Static secrets scanner.
- **\`audit/parse-audits.js\`**: Multi-workspace dependency audit parser.
- **\`audit/screenshots/\`**: 40+ full desktop and mobile screenshots of storefront and admin portal pages.

### How to Re-Run Everything with One Command:
\`\`\`powershell
# 1. Run all static and backend tests
node audit/test-backend.js
node audit/test-business-logic.js
node audit/load-test.js

# 2. Run Playwright E2E and frontend crawl
npx playwright test
node audit/test-frontend-pages.js
\`\`\`

---

## 8. RECOMMENDED FIX ORDER & REGRESSION CHECKLIST

### Phase 1: Security Blockers (Immediate Action Required)
1. **Remove \`@Public()\` from \`CustomerOrdersController.getAllOrders()\`** (\`backend/src/orders/customer-orders.controller.ts:27\`). Restrict or eliminate this route in favor of \`/orders/me\`.
2. **Remove \`@Public()\` from all \`AccountingController\` endpoints** (\`backend/src/accounting/accounting.controller.ts:18, 25, 32, 39\`). Verify \`@Roles(ROLES.READ_ONLY)\` blocks unauthenticated access.
3. **Remove \`@Public()\` from Invoice and Shipping Label endpoints** (\`backend/src/orders/customer-orders.controller.ts:38, 44\` and \`orders.controller.ts:69, 75\`). Require user authentication and ownership check.
4. **Fix Editor Shipping Navigation** in \`admin-portal/lib/roles.js\`: Add \`'/shipping'\` to \`ROLE_ALLOWED_ROUTE_PREFIXES.editor\`.

### Phase 2: Test Suite & Quality Assurance
5. **Fix Backend Unit Test Failures**: Update \`r2.service.spec.ts\` to expect 10MB limits; mock \`RAZORPAY_CONFIG\` in \`payments.service.spec.ts\`; provide missing providers in \`cart.service.spec.ts\` and \`auth.service.spec.ts\`.
6. **Remove Double-Fetch in Storefront Catalog**: Update \`app/products/page.js\` to query backend directly without initial \`/api/products\` probe.
7. **Clean Residual Storefront Admin Routes**: Update \`middleware.js\` to redirect \`/admin/*\` and \`/staff/*\` to port 3001.

### Phase 3: Dependencies & Hardening
8. **Patch Dependencies**: Upgrade \`next\`, \`proxy-addr\`, and \`axios\` to patch known CVEs.
9. **Consolidate Migrations**: Remove legacy \`backend/prisma/migrations\` and standardize on \`backend/src/prisma/migrations\`.

### Regression Checklist for Verification:
- [ ] \`curl -s http://localhost:5000/orders\` returns 401 Unauthorized.
- [ ] \`curl -s http://localhost:5000/admin/accounting/export-csv\` returns 401 Unauthorized.
- [ ] \`curl -s http://localhost:5000/orders/<id>/invoice\` returns 401 Unauthorized.
- [ ] Logging in as \`editor@sridattam.com\` in Admin Portal opens \`/shipping\` without redirecting to \`/overview\`.
- [ ] \`npm test\` in \`backend\` completes with 0 failed test suites.
- [ ] \`npx playwright test\` completes with 11/11 tests passing.
`;

fs.writeFileSync(path.join(__dirname, 'AUDIT_REPORT.md'), report);
console.log('Successfully written audit/AUDIT_REPORT.md');
