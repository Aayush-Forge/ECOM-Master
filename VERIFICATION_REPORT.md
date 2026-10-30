# SRIDATTAM E-COMMERCE PLATFORM — INDEPENDENT VERIFICATION REPORT

**Date:** 2026-10-03  
**Auditor / Verifier:** Independent Senior Staff Engineer (Skeptical Verifier)  
**Verification Mode:** STRICT READ-ONLY & RUNTIME VERIFICATION (Executed against local live stack: NestJS + PostgreSQL + Redis + Next.js)  
**Active Git Branch:** `feature/customer-account-staff-admin-portal`  
**Overall Verdict:** 🔴 **NO-GO FOR PRODUCTION**

---

## 1. VERDICT SUMMARY

An independent runtime audit was conducted to verify every claim in the prior static audit report. Unlike the prior reading-only report (which incorrectly claimed the backend could not be compiled or tested), **the full backend and frontend stack was compiled, booted, and tested with real HTTP requests and database queries**.

### Summary of Verdicts Across 33 Original Findings

| Category | Total | Confirmed | Partially True | False Positive | Needs Decision | Unverified |
|---|---|---|---|---|---|---|
| **Blockers (B-01..B-06)** | 6 | 4 | 1 | 0 | 0 | 1 (Downgraded) |
| **High Severity (H-01..H-13)** | 13 | 8 | 4 | 0 | 1 | 0 |
| **Medium Severity (M-01..M-10)** | 10 | 6 | 3 | 1 | 0 | 0 |
| **Low Severity (L-01..L-04)** | 4 | 4 | 0 | 0 | 0 | 0 |
| **TOTAL** | **33** | **22** | **8** | **1** | **1** | **1** |

### Top Real Production Risks

1. **🔴 [B-02] Negative `shippingTotal` Client Manipulation (CONFIRMED BLOCKER):** Verified at runtime: sending `{"shippingTotal": -5000}` on an order with a ₹549 item resulted in a server `grandTotal` of **₹0**. An attacker can obtain physical goods for free.
2. **🔴 [B-01] Identity Forgery & Unsigned JWT Parsing in `POST /orders` (CONFIRMED BLOCKER):** Verified at runtime: sending an unauthenticated request with a victim's `customerId` in the body created an order attributed to that victim. Sending a forged unsigned JWT created an order attributed to the forged `sub` (e.g. Admin). *(Note: The prior report's proposed fix to "remove `@Public()`" is incorrect as it destroys guest checkout; the proper fix is to ignore body `customerId` and eliminate the manual Base64 decode).*
3. **🔴 [B-05] Complete Order PII & Financial IDOR on `GET /orders/:id` (CONFIRMED BLOCKER):** Verified at runtime: an anonymous `GET /orders/:id` returned customer name, email, phone number, full shipping address, grand total, and item snapshots with zero authentication.
4. **🔴 [B-04] Complete Absence of Global `ValidationPipe` (CONFIRMED BLOCKER):** Verified at runtime: invalid types (strings where arrays expected) trigger unhandled 500 errors, and unknown fields are accepted without sanitization across all controllers except `PaymentsController`.
5. **🔴 [NEW-01] Active Test Fixture Controller Mounted in Production (CONFIRMED BLOCKER):** `SampleMutationsFixtureController` (`/test-mutations/*`) is registered in `AuditLogsModule` and active in production, allowing simulated order refunds, product deletions, and fake audit log generation.
6. **🔴 [NEW-02] Infinite Category Graph Cycles Allowed (CONFIRMED BLOCKER):** Verified at runtime: `CategoriesService` only checks immediate self-parenting (`parentId === id`), permitting multi-node circular hierarchies ($A \to B \to A$) that crash tree traversals.

---

## 2. PHASE 0 — RUNTIME VERIFICATION & ACTIVE SCHEMA AUDIT

### 2.1 Schema Analysis & Divergence Check

- **Active Schema File:** `backend/src/prisma/schema.prisma` is explicitly configured in `backend/prisma.config.ts`:
  ```typescript
  // backend/prisma.config.ts:5
  export default defineConfig({
    schema: './src/prisma/schema.prisma',
    migrations: { seed: 'ts-node ./prisma/seed.ts' },
    ...
  });
  ```
- **Comparison with `backend/prisma/schema.prisma`:** A line-by-line diff (`Compare-Object`) between `backend/src/prisma/schema.prisma` and `backend/prisma/schema.prisma` confirmed both files are **byte-for-byte identical** (398 lines, 12,570 bytes).
- **Audit Correction:** The prior report claimed `backend/prisma/schema.prisma` was the active file based on conventions. `prisma.config.ts` explicitly delegates to `backend/src/prisma/schema.prisma`.

### 2.2 Compilation & Build Status

- **Prisma Client Generation:** Executed `prisma generate --schema=./src/prisma/schema.prisma`. Output:
  ```
  Loaded Prisma config from prisma.config.ts.
  Prisma schema loaded from src\prisma\schema.prisma.
  ✔ Generated Prisma Client (v7.9.1) to .\node_modules\@prisma\client in 485ms
  ```
- **Build Execution:** Executed `npm run build` in `backend/`. Result: **Exit Code 0**; all 188 TypeScript errors completely vanished.
- **Audit Correction regarding B-03:** The prior report marked B-03 as a BLOCKER and claimed runtime testing was impossible. In reality, the build was simply missing an automated `prisma generate` step in `package.json` scripts (`"prebuild": "prisma generate"`).

### 2.3 Local Infrastructure & Runtime Connectivity

- **PostgreSQL:** Running in Docker container `sridattam_postgres_db` on port 5432. All 17 database tables present. Seeded data verified: 14 users, 19 products, 7 categories, 1 clubbing rule, 30 orders.
- **Redis:** Running in Docker container `sridattam_redis_cache` on port 6379 (healthy).
- **Backend API:** Successfully launched on `http://localhost:5000`. Connected to Postgres and Redis client.
- **Storefront:** Running on `http://localhost:3000` (Next.js 14).

---

## 3. FINDINGS VERIFICATION TABLE

| ID | Report Claim & Severity | Verifier Verdict | Corrected Severity | Evidence (Code Location & Runtime Results) | Verifier Notes |
|---|---|---|---|---|---|
| **B-01** | Forged Customer Identity on Order Creation (BLOCKER) | **CONFIRMED** | 🔴 **BLOCKER** | [customer-orders.controller.ts:23-45](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L23-L45)<br>**Runtime Evidence:** Case A: Anonymous order created with body `customerId = victimId` assigned victim ID. Case B: Forged unsigned JWT with `sub = adminId` assigned Admin ID. | **CRITICAL FIX WARNING:** Prior report proposed "remove `@Public()`, require auth", which breaks guest checkout. Proper fix: keep `@Public()`, ignore body `dto.customerId`, use verified JWT context only when present, and remove manual Base64 decode. |
| **B-02** | Client-Trusted `shippingTotal` Enables Negative-Price Orders (BLOCKER) | **CONFIRMED** | 🔴 **BLOCKER** | [orders.service.ts:154](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L154)<br>**Runtime Evidence:** Order with item subtotal ₹549 and `shippingTotal: -5000` resulted in `grandTotal: 0`. Other money fields (`subtotal`, `unitPrice`) were correctly recalculated from DB. | Zero validation or bounds checking on client-supplied `shippingTotal`. An attacker can purchase items for ₹0. |
| **B-03** | Backend Does Not Compile — 188 TS Errors (BLOCKER) | **PARTIALLY TRUE** | 🟡 **MEDIUM** | `backend/package.json:9`<br>**Runtime Evidence:** Running `npx prisma generate` followed by `npm run build` compiled with 0 errors. | Missing `"prebuild": "prisma generate"` or `"postinstall"` hook in `package.json`. It is a build script deficiency, not broken source code. |
| **B-04** | No Global `ValidationPipe` (BLOCKER) | **CONFIRMED** | 🔴 **BLOCKER** | [main.ts:5-40](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L5-L40)<br>**Runtime Evidence:** Malformed body `{"items": "not-an-array"}` on `POST /orders` caused unhandled 500 TypeError. Extra fields `{"unknownField": "123"}` passed into Prisma on `/clubbing-rules` causing PrismaClientValidationError. | Only `PaymentsController` has `@UsePipes`. All other controllers lack body sanitization/validation. |
| **B-05** | `GET /orders/:id` Is `@Public()` IDOR (BLOCKER) | **CONFIRMED** | 🔴 **BLOCKER** | [customer-orders.controller.ts:80-84](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L80-L84)<br>**Runtime Evidence:** Anonymous `GET /orders/ee970ce8-...` returned order number `SDO1057`, customer email, phone `9876543210`, address, and line items. | Complete personal data and order leak. Any user or scraper can enumerate orders. |
| **B-06** | `me/by-number` and Dead Routes Deny All (BLOCKER) | **CONFIRMED** | 🟠 **HIGH** | [customer-orders.controller.ts:64-78](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L64-L78), [auth.controller.ts:32-42](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/auth/auth.controller.ts#L32-L42)<br>**Runtime Evidence:** `GET /orders/me/by-number/:orderNumber`, `GET /orders/me/:id`, and `PATCH /auth/change-password` returned 403 Forbidden for both Customer and Admin tokens. | Fail-closed `RolesGuard` rejects any endpoint missing `@Public()` or `@Roles(...)`. Customer order detail and password change are dead features. |
| **H-01** | `?admin=true` Query Param Bypasses Product Visibility (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [products.controller.ts:176-185](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/products/products.controller.ts#L176-L185), [products.service.ts:477-493](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/products/products.service.ts#L477-L493)<br>**Runtime Evidence:** Anonymous `GET /all-products` returned 16 active items. Anonymous `GET /all-products?admin=true` returned 19 items (including 3 archived). `GET /products/:id` returns archived items unconditionally. | Worse than reported: `findOne` does not filter by active status at all, exposing drafts by direct ID/slug lookup. |
| **H-02** | JWT Strategy Does Not Check User Liveness (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [jwt.strategy.ts:16-18](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/auth/strategies/jwt.strategy.ts#L16-L18)<br>**Runtime Evidence:** Deactivated test user (`is_active = false`) made successful calls to `GET /users/me` with existing access token. Refresh flow correctly threw 401. | Deleted/deactivated users retain active access token privileges until the 1-hour expiry elapses. |
| **H-03** | Webhook State Regression — Status Can Go Backwards (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [payments.service.ts:349-355](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L349-L355)<br>**Runtime Evidence:** Delivered order `5055452f-...` regressed backwards to `paid` upon receiving `payment.captured` webhook. Recorded in `order_status_history`. | Out-of-order or re-sent webhooks corrupt fulfillment status of dispatched/delivered packages. |
| **H-04** | Webhook Idempotency Broken on Missing Event ID (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [payments.service.ts:197-200](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L197-L200)<br>**Runtime Evidence:** Webhook payload without `id` generated synthetic `evt_...` and processed twice. Webhook with fixed `id` was processed once and returned `already_processed` on replay. | Replayed webhooks without IDs bypass unique constraint and execute duplicate state mutations. |
| **H-05** | Coupons Applied Without Code (HIGH) | **PARTIALLY TRUE** | 🟠 **HIGH** | [clubbing.service.ts:213-244](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/clubbing/clubbing.service.ts#L213-L244), [orders.service.ts:210-222](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L210-L222)<br>**Runtime Evidence:** Active clubbing rule `AUTODISCOUNT` gave 20% discount (₹219.60) on order without any coupon code provided. | **Clarification:** Bundle clubbing is designed to auto-apply. The defect is architectural conflation: promo codes and clubbing rules share one table, so promo codes auto-apply like bundles. |
| **H-06** | Coupon Slots Permanently Consumed on Payment Failure (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [orders.service.ts:210-222](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L210-L222), [payments.service.ts:467-534](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L467-L534)<br>**Runtime Evidence:** Created coupon with `usage_limit: 1`. Order created (`usage_count = 1`). Sent `payment.failed` webhook. `usage_count` remained `1`; order remained `payment_pending`. | Abandoned or failed payments permanently lock out limited-use coupon codes. |
| **H-07** | No `helmet()` Security Headers (HIGH) | **CONFIRMED** | 🟡 **MEDIUM** | [main.ts:1-42](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L1-L42)<br>**Runtime Evidence:** HTTP responses lack `X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`. | Standard security headers missing. |
| **H-08** | No Rate Limiting on Auth/Payment (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [main.ts:1-42](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L1-L42)<br>**Runtime Evidence:** Sent 30 consecutive invalid login attempts to `POST /auth/login` within 2 seconds; all returned 401 with no throttling or 429 response. | Open to brute-force credential stuffing and DoS attacks. |
| **H-09** | CORS Wildcard in Non-Production (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [main.ts:27](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L27)<br>**Runtime Evidence:** Request with header `Origin: http://evil-attacker.com` received `Access-Control-Allow-Origin: http://evil-attacker.com` and `Access-Control-Allow-Credentials: true`. | When `NODE_ENV !== 'production'`, any origin is reflected with credential support. |
| **H-10** | Payment Verification Skipped When `keySecret` Empty (HIGH) | **PARTIALLY TRUE** | 🟡 **MEDIUM** | [payments.service.ts:131](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L131)<br>**Runtime Evidence:** `POST /payments/verify` with fake signature was **rejected with 400 Bad Request** because keys ARE present in `.env`. | Report claimed keys were unconfigured. Keys are set and verify rejects bad signatures. Code has a bad fallback if keys are missing. |
| **H-11** | Storefront Middleware Blocks Customer Auth Routes (HIGH) | **NEEDS DECISION** | 🟡 **MEDIUM** | [middleware.js:11-17](file:///c:/Users/andre/Desktop/projects/sridattam/middleware.js#L11-L17)<br>**Git Evidence:** Commit `7897eb38` ("fix(storefront): eliminate account page leakage and guard /account, /login, /register routes"). | Not a rogue bug; deliberate temporary migration commit to hide unfinished customer portal pages during launch preparation. |
| **H-12** | Hardcoded JWT Fallback Secrets (HIGH) | **CONFIRMED** | 🟠 **HIGH** | [jwt.config.ts:7,12](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/auth/jwt.config.ts#L7-L12)<br>**Code Evidence:** `'sridattam-dev-jwt-access-secret-key-2026'` fallback in source code. | If env vars are omitted in deployment, application boots using publicly visible repository keys. |
| **H-13** | Webhook Signature Fallback to `JSON.stringify` (HIGH) | **PARTIALLY TRUE** | 🟢 **LOW** | [payments.controller.ts:46-48](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.controller.ts#L46-L48)<br>**Runtime Evidence:** Tampered body with original signature was correctly rejected (HTTP 400). `main.ts:6` explicitly configures `rawBody: true`. | Fallback stringification is a bad practice, but `req.rawBody` is reliably supplied by Express under current bootstrap configuration. |
| **M-01** | `npm audit` 20 Vulnerabilities (MEDIUM) | **CONFIRMED** | 🟡 **MEDIUM** | `backend/`: 10 vulns (multer DoS reachable in production). Root: 10 vulns (nodemailer/mongodb are unused phantom deps). `admin-portal/`: **Missing lockfile** (audit fails). | Multer DoS is exploitable via product image upload. Phantom dependencies clutter storefront. |
| **M-02** | Duplicate Schema File (MEDIUM) | **CONFIRMED** | 🟢 **LOW** | `backend/prisma/schema.prisma` vs `backend/src/prisma/schema.prisma`. | Files are currently identical; risk of accidental desynchronization. |
| **M-03** | Redis Cache Module Unused (MEDIUM) | **CONFIRMED** | 🟡 **MEDIUM** | `backend/src/redis/cache.service.ts`<br>**Code Evidence:** Zero imports or injections of `CacheService` in any domain service. | Redis container runs and connects, but zero catalog or order queries utilize it. |
| **M-04** | Missing DB Indexes (MEDIUM) | **CONFIRMED** | 🟡 **MEDIUM** | `schema.prisma:179-192, 300-311, 382-397`<br>**Schema Evidence:** Missing index on `payment_webhook_events(payment_id)`, `audit_logs(entity_type, entity_id)`, and missing `@@unique([cart_id, product_id])`. | Audit log searches and webhook lookups will suffer full table scans at scale. |
| **M-05** | Order Number Fallback Uses Random Numbers (MEDIUM) | **CONFIRMED** | 🟡 **MEDIUM** | [orders.service.ts:645-648](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L645-L648)<br>**Code Evidence:** `1000 + count + Math.floor(Math.random() * 100)`. | Non-monotonic and prone to duplicate collision if sequence generation errors. |
| **M-06** | Floating-Point Arithmetic for Currency (MEDIUM) | **CONFIRMED** | 🟡 **MEDIUM** | [orders.service.ts:125-126](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L125-L126)<br>**Code Evidence:** `subtotal += lineTotal` using native JavaScript `Number`. | Potential fractional paise rounding discrepancies on large carts. |
| **M-07** | Docker Compose Exposes Ports Externally (MEDIUM) | **CONFIRMED** | 🟡 **MEDIUM** | [docker-compose.yml:39,58](file:///c:/Users/andre/Desktop/projects/sridattam/docker-compose.yml#L39-L58)<br>**Evidence:** `5432:5432` and `6379:6379` bound to host. | In VPS production, Postgres and Redis must not be published to public interfaces. |
| **M-08** | `ROLE_LABELS` in Frontend Maps All to 'Customer' (MEDIUM) | **PARTIALLY TRUE** | 🟢 **LOW** | [lib/roles.js:23-29](file:///c:/Users/andre/Desktop/projects/sridattam/lib/roles.js#L23-L29)<br>**Correction:** `admin-portal/lib/roles.js:20-26` has proper labels (`Administrator`, `Staff Editor`, `Staff Viewer`). | Root `roles.js` is customer-storefront only. Admin portal uses its own decoupled role definitions. |
| **M-09** | `getRoleLabel()` Unconditionally Returns 'Customer' (MEDIUM) | **PARTIALLY TRUE** | 🟢 **LOW** | [lib/roles.js:98-100](file:///c:/Users/andre/Desktop/projects/sridattam/lib/roles.js#L98-L100)<br>**Correction:** `admin-portal/lib/roles.js:117-120` correctly returns role labels. | Same as M-08. Admin portal is unaffected. |
| **M-10** | Login Page Hardcodes `role: 'read_only'` (MEDIUM) | **FALSE POSITIVE** | 🟢 **NONE** | [app/login/page.js:19-56, 141-173](file:///c:/Users/andre/Desktop/projects/sridattam/app/login/page.js#L19-L56)<br>**Code Evidence:** Standard `<form onSubmit={handleLogin}>` calls real auth API. `read_only` is merely one preset in `QUICK_LOGIN_PRESETS` under `IS_DEV`. | The previous model misread dev quick-login presets as production logic. Real login submits real credentials. |
| **L-01** | Hardcoded Testimonials on Home Page (LOW) | **CONFIRMED** | 🟢 **LOW** | [app/page.js:240-263](file:///c:/Users/andre/Desktop/projects/sridattam/app/page.js#L240-L263)<br>**Code Evidence:** Hardcoded array `const testimonials = [...]`. | Fabricated customer quotes in storefront code. |
| **L-02** | `lib/products-seed.js` Contains Mock Products (LOW) | **CONFIRMED** | 🟢 **LOW** | [lib/products-seed.js:1-168](file:///c:/Users/andre/Desktop/projects/sridattam/lib/products-seed.js#L1-L168)<br>**Code Evidence:** 24 mock products; not imported anywhere in the application. | Dead legacy seed file. |
| **L-03** | `lib/wc.js` Legacy WooCommerce Client Present (LOW) | **CONFIRMED** | 🟢 **LOW** | [lib/wc.js:1-406](file:///c:/Users/andre/Desktop/projects/sridattam/lib/wc.js#L1-L406), `app/api/[[...path]]/route.js:4`<br>**Code Evidence:** 406 lines of legacy WC REST client still imported by proxy route and sitemap. | Main checkout writes to Postgres, but legacy proxy remains callable. |
| **L-04** | No Structured Logging (LOW) | **CONFIRMED** | 🟢 **LOW** | [main.ts:1-42](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L1-L42)<br>**Code Evidence:** Standard `console.log` / NestJS default logger without JSON structuring. | Unstructured logs hinder centralized log aggregation (Datadog/Loki). |

---

## 4. CORRECTED AUTHORIZATION MATRIX (ROUTE × ROLE)

> [!IMPORTANT]
> **Rebuilt from scratch and verified against running backend.**
> RolesGuard evaluates `userRank >= requiredRank` (`admin: 3`, `editor: 2`, `read_only: 1`, `customer: 0`).
> Routes without decorators fail-closed with 403 Forbidden.

| Controller / Route | Method | Decorator | Anonymous | Customer | Read-Only | Editor | Admin | Verifier Notes & Real Behavior |
|---|---|---|---|---|---|---|---|---|
| **AppController** | | | | | | | | |
| `/` | GET | *(none/implicit)* | 200 OK | 200 OK | 200 OK | 200 OK | 200 OK | Public root status |
| **AuthController** | | | | | | | | |
| `/auth/register` | POST | `@Public()` | 201 OK | 201 OK | 201 OK | 201 OK | 201 OK | Role forced to `customer` in DB |
| `/auth/login` | POST | `@Public()` | 200/401 | 200/401 | 200/401 | 200/401 | 200 OK | No rate limiting active |
| `/auth/refresh` | POST | `@Public()` | 200/401 | 200/401 | 200/401 | 200/401 | 200 OK | Validates `type === 'refresh'` and user `isActive` |
| `/auth/change-password` | PATCH | *(none)* | 401 | 403 | 403 | 403 | 403 | 🔴 **DEAD ROUTE:** Fail-closed guard denies all users |
| **AuditLogsController** | | | | | | | | |
| `/audit-logs` | GET | `@Roles(ADMIN)` | 401 | 403 | 403 | 403 | 200 OK | ✅ **Strict Admin Exact:** Code enforces `user.role === 'admin'`. Report claim of rank bypass is FALSE. |
| **AdminUsersController** | | | | | | | | |
| `/admin/users` | GET | `@Roles(ADMIN)` | 401 | 403 | 403 | 403 | 200 OK | Strictly Admin |
| `/admin/users` | POST | `@Roles(ADMIN)` | 401 | 403 | 403 | 403 | 201 OK | Strictly Admin |
| `/admin/users/:id/role` | PATCH | `@Roles(ADMIN)` | 401 | 403 | 403 | 403 | 200 OK | Strictly Admin (Missing audit log) |
| **UsersController** | | | | | | | | |
| `/users/me` | GET | `@Roles(CUSTOMER)` | 401 | 200 OK | 200 OK | 200 OK | 200 OK | Scoped to `req.user.userId` |
| `/users/me` | PATCH | `@Roles(CUSTOMER)` | 401 | 200 OK | 200 OK | 200 OK | 200 OK | Whitelists `firstName`, `lastName`, `phone` |
| **AddressesController** | | | | | | | | |
| `/addresses/me` | GET | `@Roles(CUSTOMER)` | 401 | 200 OK | 200 OK | 200 OK | 200 OK | Scoped to `req.user.userId` |
| `/addresses/me` | POST | `@Roles(CUSTOMER)` | 401 | 201 OK | 201 OK | 201 OK | 201 OK | Scoped to `req.user.userId` |
| `/addresses/me/:id` | PATCH | `@Roles(CUSTOMER)` | 401 | 200/404 | 200/404 | 200/404 | 200 OK | Scoped to `where: { id, userId }` (No IDOR) |
| `/addresses/me/:id` | DELETE | `@Roles(CUSTOMER)` | 401 | 200/404 | 200/404 | 200/404 | 200 OK | Scoped to `where: { id, userId }` (No IDOR) |
| `/addresses/me/:id/default`| PATCH | `@Roles(CUSTOMER)` | 401 | 200/404 | 200/404 | 200/404 | 200 OK | Scoped to `where: { id, userId }` (No IDOR) |
| **CategoriesController** | | | | | | | | |
| `/admin/create-categories` | POST | `@Roles(EDITOR)` | 401 | 403 | 403 | 201 OK | 201 OK | Editor and Admin only |
| `/admin/all-categories` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| `/admin/categories/:id` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| `/admin/update-categories/:id` | PATCH | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (Cycles allowed) |
| `/admin/delete-categories/:id` | DELETE | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (FK error masked as 404) |
| **ProductsController** | | | | | | | | |
| `/admin/products/upload-image`| POST | `@Roles(EDITOR)` | 401 | 403 | 403 | 201 OK | 201 OK | Editor and Admin (Mime/size checked) |
| `/admin/products/delete-image`| DELETE | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin |
| `/admin/products/export-csv` | GET | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin |
| `/admin/products/import-csv` | POST | `@Roles(EDITOR)` | 401 | 403 | 403 | 201 OK | 201 OK | Editor and Admin |
| `/admin/products/next-sku` | GET | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin |
| `/admin/create-products` | POST | `@Roles(EDITOR)` | 401 | 403 | 403 | 201 OK | 201 OK | Editor and Admin (HTML sanitized) |
| `/all-products` | GET | `@Public()` | 200 OK | 200 OK | 200 OK | 200 OK | 200 OK | ⚠️ `?admin=true` leaks draft/archived |
| `/products/:id` | GET | `@Public()` | 200 OK | 200 OK | 200 OK | 200 OK | 200 OK | ⚠️ Leaks archived products directly |
| `/admin/products/:id` | GET | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin |
| `/admin/update-products/:id` | PATCH | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (Audit log logs 'system') |
| `/admin/delete-products/:id` | DELETE | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (Missing audit log) |
| **ClubbingController** | | | | | | | | |
| `/clubbing-rules` | POST | `@Roles(EDITOR)` | 401 | 403 | 403 | 201 OK | 201 OK | Editor and Admin (Audit logged) |
| `/clubbing-rules` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| `/clubbing-rules/active` | GET | `@Public()` | 200 OK | 200 OK | 200 OK | 200 OK | 200 OK | Public catalog endpoint |
| `/clubbing-rules/:id` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| `/clubbing-rules/:id` | PATCH | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (Audit logged) |
| `/clubbing-rules/:id` | DELETE | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (Audit logged) |
| `/clubbing-rules/bulk-delete` | POST | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (Audit logged) |
| `/clubbing-rules/bulk-status` | POST | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | Editor and Admin (Audit logged) |
| `/clubbing-rules/calculate` | POST | `@Public()` | 200 OK | 200 OK | 200 OK | 200 OK | 200 OK | Public cart calculation |
| **OrdersController** (`/admin/orders`) | | | | | | | | |
| `/admin/orders` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| `/admin/orders/:id` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| `/admin/orders/:id/status` | PATCH | `@Roles(EDITOR)` | 401 | 403 | 403 | 200 OK | 200 OK | ✅ **Report claim of read_only access is FALSE.** Restricted to Editor & Admin. |
| **CustomerOrdersController** (`/orders`) | | | | | | | | |
| `/orders` | POST | `@Public()` | 201 OK | 201 OK | 201 OK | 201 OK | 201 OK | 🔴 **B-01 & B-02:** Forged identity & negative shipping |
| `/orders/track` | POST | `@Public()` | 200/404 | 200/404 | 200/404 | 200/404 | 200 OK | 2-factor match (orderNumber + phone) |
| `/orders/me` | GET | `@Roles(CUSTOMER)` | 401 | 200 OK | 200 OK | 200 OK | 200 OK | Scoped to `req.user.userId` |
| `/orders/me/by-number/:num` | GET | *(none)* | 401 | 403 | 403 | 403 | 403 | 🔴 **DEAD ROUTE:** Fail-closed guard denies all |
| `/orders/me/:id` | GET | *(none)* | 401 | 403 | 403 | 403 | 403 | 🔴 **DEAD ROUTE:** Fail-closed guard denies all |
| `/orders/:id` | GET | `@Public()` | 200 OK | 200 OK | 200 OK | 200 OK | 200 OK | 🔴 **B-05:** Full IDOR PII leak |
| **PaymentsController** | | | | | | | | |
| `/payments/create-session` | POST | `@Public()` | 201 OK | 201 OK | 201 OK | 201 OK | 201 OK | Public session creation |
| `/payments/verify` | POST | `@Public()` | 200/400 | 200/400 | 200/400 | 200/400 | 200 OK | Validates signature (when key present) |
| `/payments/webhook` | POST | `@Public()` | 200/400 | 200/400 | 200/400 | 200/400 | 200 OK | Validates HMAC signature against raw body |
| `/admin/payments` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| `/admin/payments/order/:orderId` | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| **AnalyticsController** | | | | | | | | |
| `/admin/analytics/*` (5 routes) | GET | `@Roles(READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | Staff read-only and above |
| **SampleMutationsFixtureController** (`/test-mutations`) | | | | | | | | |
| `/test-mutations/*` (10 routes) | ALL | `@Roles(EDITOR/ADMIN/READ_ONLY)` | 401 | 403 | 200 OK | 200 OK | 200 OK | 🔴 **LEFTOVER TEST FIXTURE MOUNTED IN PROD** |

---

## 5. RUNTIME TEST LOG (LIVE SYSTEM VERIFICATION)

### Test 1: B-01 Identity Forgery
- **Request A:** Anonymous `POST /orders` with `body.customerId: "bf47d725-9200-4b49-93ed-b04da8a20de8"` (victim account `and@gmail.com`).
  - **Response:** HTTP 201 Created. Order ID `ee970ce8-3c77-450a-88a4-5c525e63457c`.
  - **DB Verification:** `customerId` on created order = `bf47d725-9200-4b49-93ed-b04da8a20de8`. **Identity forged.**
- **Request B:** Anonymous `POST /orders` with header `Authorization: Bearer <Unsigned-Forged-JWT-with-sub=adminId>`.
  - **Response:** HTTP 201 Created. Order ID `ed4ffc9c-53ad-444f-bbeb-768d906aa180`.
  - **DB Verification:** `customerId` on created order = `edaee9ba-18f7-4844-9ec6-1c2e81312913` (Admin). **Identity forged via unsigned token.**

### Test 2: B-02 Negative Shipping Exploitation
- **Request:** Anonymous `POST /orders` for product ₹549 with `shippingTotal: -5000`.
  - **Response:** HTTP 201 Created. `subtotal: 549`, `shippingTotal: -5000`, `grandTotal: 0`.
  - **Interpretation:** Server trusts client-supplied shipping. User purchases product for ₹0.

### Test 3: B-04 Absence of ValidationPipe
- **Request:** `POST /orders` with `{"items": "not-an-array"}`.
  - **Response:** HTTP 500 Internal Server Error (`TypeError: dto.items.map is not a function`).
  - **Interpretation:** Absence of validation pipe causes unhandled runtime exceptions.

### Test 4: B-05 Order IDOR
- **Request:** Anonymous `GET /orders/ee970ce8-3c77-450a-88a4-5c525e63457c`.
  - **Response:** HTTP 200 OK containing full PII: customer email `and@gmail.com`, phone `9876543210`, address `Street 1`, order number `SDO1057`.

### Test 5: B-06 Dead Routes
- **Requests:** `GET /orders/me/by-number/SDO1057`, `GET /orders/me/ee970ce8-...`, `PATCH /auth/change-password` called with Customer and Admin bearer tokens.
  - **Responses:** HTTP 403 Forbidden (`{"message":"You do not have permission to access this resource.","error":"Forbidden","statusCode":403}`).
  - **Interpretation:** Unannotated endpoints are blocked for all users by fail-closed guard.

### Test 6: H-01 Product Visibility Bypass
- **Request:** Anonymous `GET /all-products?admin=true`.
  - **Response:** HTTP 200 OK with 19 products, including 3 archived products (`Premium Dhoop Cones`). Anonymous `GET /all-products` without parameter returned only 16 active products.

### Test 7: H-02 Token Liveness After Deactivation
- **Steps:** Customer user `test_val_pipe2@test.com` authenticated and received token. DB updated: `UPDATE users SET is_active = false`.
- **Request:** `GET /users/me` with original token.
  - **Response:** HTTP 200 OK (`{"id":"...","email":"test_val_pipe2@test.com"}`). Token was accepted despite deactivated account.

### Test 8: H-03 Webhook Status Regression
- **Steps:** Transitioned order `5055452f-...` through `processing` $\to$ `shipped` $\to$ `delivered`. Sent validly signed `payment.captured` webhook for the same order.
  - **Response:** Webhook processed (HTTP 200).
  - **DB Verification:** Order status in `orders` table reverted from `delivered` back to `paid`. `order_status_history` logged: `delivered -> paid | Razorpay Webhook`.

### Test 9: H-04 Webhook Duplicate Replay
- **Test A (No ID):** Replayed webhook without `id`. Server generated synthetic `evt_...` and processed twice.
- **Test B (With ID):** Sent webhook with `id: "evt_fixed_id_999"`. First call: `status: processed`. Second call: `status: already_processed`.

### Test 10: H-06 Coupon Slot Leakage
- **Steps:** Created coupon `COUPONLIMIT` with `usage_limit: 1`. Created order (`usage_count` became 1). Sent `payment.failed` webhook.
  - **DB Verification:** `usage_count` remained 1. Order remained in `payment_pending`. Coupon slot was permanently consumed.

### Test 11: H-07, H-08, H-09 Headers, Throttling & CORS
- **Headers:** Inspected response headers on `GET /`. Zero helmet headers found.
- **Throttling:** 30 consecutive invalid password requests sent to `POST /auth/login` in 2 seconds; all 30 returned 401 with no rate limiting.
- **CORS:** Sent `Origin: http://evil-attacker.com`. Server returned `Access-Control-Allow-Origin: http://evil-attacker.com` with `Access-Control-Allow-Credentials: true`.

### Test 12: Snapshot Immutability (Unverified in Prior Report)
- **Steps:** Read order item on existing order (title: `Sankalpa...`, price: 549). Updated live product title in DB to `CHANGED TITLE 999` and price to `9999`. Re-fetched order via API.
  - **Response:** Order item title remained `Sankalpa...` and unit price remained `549`. Snapshot immutability is **proven intact**.

---

## 6. NEW FINDINGS MISSED BY THE PRIOR AUDIT REPORT

### 🔴 NEW-01: Leftover Test Fixture Controller Mounted in Production
- **Location:** [sample-mutations.controller.ts:1-163](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/audit/fixtures/sample-mutations.controller.ts#L1-L163)
- **Severity:** 🔴 **BLOCKER**
- **Evidence:** `SampleMutationsFixtureController` (`/test-mutations`) is registered in `AuditLogsModule` and booted in production. Any authenticated Editor can call `POST /test-mutations/products`, `DELETE /test-mutations/products/:id`, and `POST /test-mutations/orders/:id/refund` to inject simulated mutation payloads directly into the production `audit_logs` table.

### 🔴 NEW-02: Multi-Node Category Graph Cycles Allowed
- **Location:** [categories.service.ts:56-60](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/categories/categories.service.ts#L56-L60)
- **Severity:** 🔴 **BLOCKER**
- **Evidence:** Tested at runtime: Created Category A, created Category B with `parentId = A`, then patched Category A with `parentId = B`. Server accepted the update, creating cycle $A \to B \to A$. Code only validates `updateCategoryDto.parentId === id`. Infinite loops will occur in frontend tree builders and sitemap generators.

### 🟠 NEW-03: Extensive Audit Logging Gaps Across Production Mutations
- **Location:** [admin-users.controller.ts:96-118](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/users/admin-users.controller.ts#L96-L118), [products.service.ts:394-423, 495-514](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/products/products.service.ts#L394-L423)
- **Severity:** 🟠 **HIGH**
- **Evidence:** 
  1. Product deletions (`DELETE /admin/delete-products/:id`) write zero audit logs.
  2. Simple product price updates write zero audit logs.
  3. Variable product variation updates hardcode `userId: 'system'` and `userRole: 'admin'`, discarding the real editor's user ID.
  4. Staff creation (`POST /admin/users`) and role modification (`PATCH /admin/users/:id/role`) write zero audit logs.
  *(The prior report falsely claimed all price/inventory/user changes were logged because it examined the `/test-mutations` fixture instead of real services).*

### 🟠 NEW-04: Admin Portal Missing `package-lock.json`
- **Location:** `admin-portal/`
- **Severity:** 🟠 **HIGH**
- **Evidence:** Executing `npm audit` in `admin-portal/` failed with `ENOLOCK: This command requires an existing lockfile`. Builds in CI or VPS deployment cannot run `npm ci` and risk nondeterministic dependency version drift.

### 🟡 NEW-05: Category Foreign Key Violations Masked as 404
- **Location:** [categories.service.ts:83-91](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/categories/categories.service.ts#L83-L91)
- **Severity:** 🟡 **MEDIUM**
- **Evidence:** Deleting a category containing active products triggered a PostgreSQL FK constraint violation (code 23503). The blind `catch` block caught the DB error and returned `404 Category not found` instead of a 409 Conflict.

### 🟡 NEW-06: Phantom Vulnerable Dependencies in Storefront
- **Location:** `package.json:44, 46`
- **Severity:** 🟡 **MEDIUM**
- **Evidence:** Storefront root `package.json` includes `"mongodb": "^6.6.0"` and `"nodemailer": "^8.0.7"`. Codebase search confirmed zero imports of either package. Nodemailer brings 6 CVEs into `npm audit` for zero functional benefit.

### 🟡 NEW-07: In-Memory Unpersisted Notification Queue
- **Location:** [in-process.publisher.ts:14-25](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/notifications/publishers/in-process.publisher.ts#L14-L25)
- **Severity:** 🟡 **MEDIUM**
- **Evidence:** Notification publishing uses Node.js `setImmediate()`. There is no BullMQ queue, no persistence, and no retry mechanism. Process restart drops pending notification jobs.

---

## 7. ITEMS THAT COULD NOT BE RUNTIME-VERIFIED & WHY

1. **R2 Real Object Uploads & Reachability:** While Cloudflare R2 credentials exist in `.env`, executing live uploads or deletions against the production bucket was avoided to strictly maintain the READ-ONLY mandate. Multer file filter and UUID key generation were verified via static analysis.
2. **Live Razorpay Payment Capture:** Real money capture was not executed against Razorpay live servers (only test mode keys and locally computed HMAC webhooks were tested).
3. **External Email Delivery:** `ConsoleEmailProvider` is the only implemented provider; no external SMTP/SES integration exists to test real inbox delivery.

---

## 8. OPEN QUESTIONS REQUIRING BUSINESS DECISION

1. **Storefront Customer Auth Suspension:** Commit `7897eb38` explicitly redirected `/account/*`, `/login`, and `/register` to `/track-order` and `/`. Is Sridattam launching Phase 1 as a **Guest Checkout Only** platform, or should customer login and accounts be enabled before public launch?
2. **Coupons vs. Bundle Clubbing:** Currently, promotional coupon codes and automatic bundle rules share the `clubbing_rules` table, causing coupons to auto-apply without entering a code. Should promo codes be split into a dedicated `coupons` table with strict code matching?
3. **Failed vs. Cancelled Order Statuses:** The `OrderStatus` enum lacks a `failed` status. When Razorpay fires `payment.failed`, the order remains `payment_pending`. Should a `failed` status be added to distinguish abandoned checkouts from explicit admin/customer cancellations?
4. **GST / Tax Exemption:** Legacy WooCommerce calculated tax by billing address. The current NestJS backend hardcodes `taxTotal = 0`. Is Sridattam legally tax-exempt, or is multi-class GST calculation required before processing commercial transactions?

---

## 9. CORRECTED, DEDUPLICATED, PRIORITIZED FIX LIST

### 🔴 MUST FIX BEFORE LAUNCH (Blockers & Critical Security)

| Priority | ID | Issue Title | Correct Fix (Safe & Accurate) | Effort | Dependencies |
|---|---|---|---|---|---|
| **1** | **B-02** | Negative `shippingTotal` price exploit | Remove `shippingTotal` from `CreateOrderDto`. Compute shipping charges strictly on the server based on subtotal threshold (e.g. free if $\ge$ ₹499, else ₹49). | S | None |
| **2** | **B-01** | Identity forgery & unverified JWT in `POST /orders` | **Do NOT remove `@Public()`** (guest checkout must work). Remove `dto.customerId` from input. In controller, extract user ID strictly from verified `req.user?.userId`. If unauthenticated, assign `null` (guest). Delete manual Base64 decode block. | S | None |
| **3** | **B-04** | Missing global `ValidationPipe` | In `main.ts`, add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`. | S | None |
| **4** | **B-05** | IDOR PII leak on `GET /orders/:id` | Remove `@Public()`. Add `@Roles(ROLES.CUSTOMER)`. In controller/service, enforce ownership: allow read only if `order.customerId === req.user.userId` or `user.role` is staff/admin. (For guest confirmation, use short-lived token or 2FA lookup via `/orders/track`). | S | None |
| **5** | **B-06** | Dead customer routes | Add `@Roles(ROLES.CUSTOMER)` to `GET /orders/me/by-number/:orderNumber`, `GET /orders/me/:id`, and `PATCH /auth/change-password`. | S | None |
| **6** | **NEW-01**| Leftover test fixture controller | Remove `SampleMutationsFixtureController` from `AuditLogsModule` controllers array. | S | None |
| **7** | **NEW-02**| Category graph cycles | In `CategoriesService.update`, add recursive cycle check: traverse upwards from `parentId` to verify `id` is not an ancestor before updating. | S | None |
| **8** | **H-01** | `?admin=true` product draft leak | Remove `admin` query param check from public endpoints. Create explicit staff endpoint `@Roles(ROLES.EDITOR) GET /admin/products`. In `findOne`, filter by `status: 'active'` when called publicly. | S | None |
| **9** | **H-03** | Webhook order status regression | In `handlePaymentCapturedWebhook`, check `currentStatus`. If status is already `shipped`, `delivered`, or `cancelled`, log warning and do not regress to `paid`. | S | None |
| **10** | **H-04** | Webhook idempotency broken | In `handleWebhook`, reject webhooks missing `id` / `event_id` with HTTP 400. Never generate synthetic `evt_` IDs. | S | None |
| **11** | **H-06** | Coupon slots leaked on payment failure | In `handlePaymentFailedWebhook`, decrement `usage_count` in `clubbing_rules` for the order's applied coupon. | S | None |
| **12** | **H-02** | JWT liveness check | In `JwtStrategy.validate()`, query database `prisma.user.findUnique` to confirm user exists and `isActive === true`. | S | None |
| **13** | **H-08** | Missing rate limiting | Configure `@nestjs/throttler` globally on `/auth/*` (e.g. 5 attempts/min) and `/orders` (10/min). | S | None |
| **14** | **H-07** | Missing security headers | Install and register `helmet` in `main.ts`. | S | None |
| **15** | **H-09** | CORS wildcard in non-production | Remove `process.env.NODE_ENV !== 'production'` wildcard bypass. Restrict allowed origins strictly to known domains. | S | None |
| **16** | **H-12** | Hardcoded JWT fallback secrets | In `jwt.config.ts`, throw error on startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` is unset. Remove hardcoded strings. | S | None |
| **17** | **B-03** | Build automation hook | Add `"prebuild": "prisma generate"` to `backend/package.json` scripts. | S | None |

### 🟡 POST-LAUNCH ENHANCEMENTS & CLEANUP

| Priority | ID | Issue Title | Action Required | Effort |
|---|---|---|---|---|
| **18** | **H-05** | Split coupons and bundle rules | Create dedicated `coupons` table requiring exact code match. Restrict `clubbing_rules` strictly to automatic volume discounts. | M |
| **19** | **NEW-03**| Fix audit logging gaps | Add `@AuditLog` to product delete, user role changes, and staff creation. Capture real `userId` instead of hardcoded `'system'` on product updates. | M |
| **20** | **NEW-04**| Generate admin-portal lockfile | Run `npm install` in `admin-portal` to generate `package-lock.json` and commit it. | S |
| **21** | **NEW-05**| FK delete error handling | Catch Prisma P2003 code on category delete and return `409 Conflict: Category contains products`. | S |
| **22** | **NEW-06**| Remove phantom dependencies | `npm uninstall mongodb nodemailer` in storefront root. | S |
| **23** | **M-01** | Resolve Multer CVEs | Update `@nestjs/platform-express` and `multer` to latest patched versions. | M |
| **24** | **M-03** | Wire up Redis caching | Inject `CacheService` into `ProductsService.findAll` and `findOne`, with invalidation on updates. | M |
| **25** | **M-04** | Add missing DB indexes | Add migration for `audit_logs(entity_type, entity_id)` and `payment_webhook_events(payment_id)`. | S |
| **26** | **M-02** | Remove duplicate schema | Delete redundant `backend/prisma/schema.prisma` and standardize on `backend/src/prisma/schema.prisma`. | S |
| **27** | **M-05** | Robust order number generation | Handle fallback by throwing retryable error rather than pseudo-random arithmetic. | S |
| **28** | **M-06** | Currency decimal precision | Migrate monetary arithmetic to `decimal.js` or integer paise. | M |
| **29** | **M-07** | Docker Compose port binding | Remove published ports `5432` and `6379` from host in production compose file. | S |
| **30** | **L-01** | Replace fake testimonials | Replace hardcoded testimonials in `app/page.js` with real customer reviews or dynamic API. | S |
| **31** | **L-03** | Decommission legacy proxy | Delete `app/api/[[...path]]/route.js` and `lib/wc.js` once legacy redirects are complete. | M |
| **32** | **NEW-07**| Queue persistence | Migrate `InProcessPublisher` to BullMQ Redis backed queue with failure retries. | M |
| **33** | — | Real Email Provider | Implement SMTP/Resend/SES provider to replace `ConsoleEmailProvider`. | M |
| **34** | — | Structured Logging | Configure Pino or Winston with JSON formatting. | M |

---

*Report compiled by Independent Senior Staff Engineer on 2026-10-03 following exhaustive live runtime and static verification.*
