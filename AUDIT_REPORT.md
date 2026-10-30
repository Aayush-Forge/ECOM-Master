# SRIDATTAM E-COMMERCE PLATFORM — PRE-PRODUCTION AUDIT REPORT

**Date:** 2026-10-03  
**Auditor:** Staff Engineer (automated deep audit)  
**Branch:** `feature/customer-account-staff-admin-portal`  
**Verdict:** 🔴 **NO-GO** — Multiple blockers in security, build health, and payment integrity must be resolved before production.

---

## 1. EXECUTIVE SUMMARY

The Sridattam e-commerce platform is a migration from WordPress/WooCommerce to a custom NestJS + PostgreSQL + Redis backend with a Next.js 14 storefront and a separate admin portal. The architecture is well-conceived, the schema is solid in structure, and core flows (order creation, payment integration, notification decoupling) are meaningfully built. However, the codebase has **critical security holes, a broken build, and business logic defects** that make it unsafe for production traffic handling real money.

### Top 5 Risks

1. **🔴 BLOCKER — Order creation endpoint is `@Public()` with forged identity**: The `POST /orders` endpoint accepts an arbitrary `customerId` from the body and manually parses JWT tokens without signature verification. An attacker can create orders as any user ([customer-orders.controller.ts:23-45](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L23-L45)).

2. **🔴 BLOCKER — Client-submitted `shippingTotal` is trusted**: An attacker can send `{"shippingTotal": -5000}` to reduce their order total to near-zero and effectively steal products ([orders.service.ts:154](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L154)).

3. **🔴 BLOCKER — Backend does not compile (188 TS errors)**: Prisma Client is not generated; every model accessor and enum import fails. The backend cannot be built, tested, or deployed. No CI gate exists to catch this.

4. **🔴 BLOCKER — No global `ValidationPipe`**: DTO validation decorators (`@IsString`, `@IsEmail`, etc.) are completely ignored on all endpoints except `PaymentsController`. Any malformed/malicious JSON body is accepted ([main.ts:5-40](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L5-L40)).

5. **🔴 HIGH — Public product endpoint leaks drafts/archived via `?admin=true`**: Unauthenticated users can view draft and archived products by simply adding a query parameter. No auth check is performed ([products.controller.ts:176-185](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/products/products.controller.ts#L176-L185)).

---

## 2. PHASE 0 — ORIENTATION

### 2.1 Repository Structure

| Component | Location | Framework |
|---|---|---|
| Backend API | `backend/` | NestJS (TypeScript) |
| Storefront | root (`app/`, `components/`, `lib/`) | Next.js 14 (JavaScript) |
| Admin Portal | `admin-portal/` | Next.js (JavaScript, separate app) |
| Database | `backend/prisma/` | PostgreSQL via Prisma ORM |
| Docker | `docker-compose.yml`, `Dockerfile` | Docker Compose v3.8 |

### 2.2 NestJS Modules

`AuthModule`, `PrismaModule`, `AuditLogsModule`, `UsersModule`, `AddressesModule`, `RedisModule`, `R2Module`, `CategoriesModule`, `ProductsModule`, `ClubbingModule`, `OrdersModule`, `PaymentsModule`, `NotificationsModule`, `AnalyticsModule`

### 2.3 Prisma Schema Duplication

Two `schema.prisma` files exist:
- `backend/prisma/schema.prisma` (398 lines) — **ACTIVE** (default Prisma convention, referenced by `package.json` seed script)
- `backend/src/prisma/schema.prisma` (398 lines) — **DUPLICATE**

**Finding:** Files are **byte-identical** (12570 bytes each). The `src/prisma/` copy should be removed to avoid divergence risk.

### 2.4 Environment Variables (names only)

**`.env.example`** covers: `DATABASE_URL`, `REDIS_HOST/PORT/PASSWORD`, `JWT_SECRET`, `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME/PUBLIC_BASE_URL`, `RAZORPAY_KEY_ID/KEY_SECRET`, `EMAIL_PROVIDER/FROM/BRAND_NAME`, `INTERNAL_ALERT_EMAILS`, `EMAIL_DEBUG`

**Missing from `.env.example`:** `JWT_REFRESH_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NODE_ENV`, `PORT`, `FRONTEND_URL`, `ADMIN_URL`, `NEXT_PUBLIC_WC_BASE_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`

### 2.5 Git State

- **Active branch:** `feature/customer-account-staff-admin-portal`
- **Default remote branch:** `origin/NEX`
- **Uncommitted changes (9 files):** `app/checkout/page.js`, `app/order-confirmation/page.js`, `backend/src/main.ts`, `backend/src/payments/payments.controller.spec.ts`, `backend/src/payments/payments.controller.ts`, `backend/src/payments/payments.service.spec.ts`, `backend/src/payments/payments.service.ts`, `backend/src/payments/razorpay.config.ts`, `lib/api/orders.js`
- **Stale remote branches:** `origin/feature/nestjs-backend`, `origin/feature/dockerization-setup`, `origin/subhash`, `origin/main`

### 2.6 Docker Compose Services

| Service | Image | Ports | Notes |
|---|---|---|---|
| `api` | Custom Dockerfile (dev target) | 3000:3000 | Sources `.env`, mounts full repo |
| `postgres` | postgres:15-alpine | 5432:5432 | Credentials in plaintext in yml |
| `redis` | redis:7-alpine | 6379:6379 | `--save "" --appendonly no` (ephemeral) |

> [!CAUTION]
> `docker-compose.yml` contains **hardcoded database credentials** (`sridattam_admin` / `sridattam_secure_pass_2026`) in plaintext at lines 20-22 and 41-43.

---

## 3. FINDINGS BY SEVERITY

### 🔴 BLOCKERS

#### B-01: Forged Customer Identity on Order Creation
- **Location:** [customer-orders.controller.ts:23-45](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L23-L45)
- **Evidence:** The `POST /orders` endpoint is `@Public()`. Line 29: `let customerId = req.user?.userId || dto.customerId;`. If unauthenticated, the attacker-supplied `dto.customerId` is used. Lines 31-43 also attempt manual base64 JWT decode **without signature verification**.
- **Impact:** Any anonymous user can create orders attributed to any customer, see their data, and manipulate their account.
- **Fix:** Remove `@Public()`, require authentication. For guest checkout, never accept `customerId` from the body; only from verified JWT. Remove the manual JWT decoding block entirely.
- **Effort:** S

#### B-02: Client-Trusted `shippingTotal` Enables Negative-Price Orders
- **Location:** [orders.service.ts:154](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L154)
- **Evidence:** `const shippingTotal = dto.shippingTotal !== undefined ? Number(dto.shippingTotal) : ...` — The server blindly trusts the client-submitted shipping amount. An attacker can send `{"shippingTotal": -10000}` to make `grandTotal` near-zero.
- **Impact:** Theft of physical goods for effectively nothing.
- **Fix:** Server must compute shipping. Never accept `shippingTotal` from the client DTO. Remove from `CreateOrderDto`.
- **Effort:** S

#### B-03: Backend Does Not Compile — 188 TypeScript Errors
- **Location:** `backend/` (all modules)
- **Evidence:** `npm run build` exits with 188 errors. Root cause: Prisma Client not generated (`prisma generate` not in build chain). All `PrismaService.model` accessors, all `@prisma/client` enum imports, and all `$transaction`/`$queryRawUnsafe` calls fail.
- **Impact:** Cannot build, test, or deploy the backend. No CI is catching this.
- **Fix:** Add `prisma generate` before `nest build` in the `build` script. Ensure CI runs `npm run build` as a gate.
- **Effort:** S

#### B-04: No Global `ValidationPipe` — All DTOs Are Ignored
- **Location:** [main.ts:5-40](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L5-L40)
- **Evidence:** `main.ts` has no `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))`. Only `PaymentsController` (line 22) applies its own `@UsePipes`. Every other controller accepts any JSON shape.
- **Impact:** Mass-assignment, type confusion, injection vectors across all endpoints.
- **Fix:** Add global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` in `main.ts`.
- **Effort:** S

#### B-05: `GET /orders/:id` Is `@Public()` — Full Order IDOR
- **Location:** [customer-orders.controller.ts:80-84](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L80-L84)
- **Evidence:** `@Get(':id') @Public() getOrder(...)` returns full order with customer PII, addresses, payment info — no ownership check.
- **Impact:** Anyone who guesses or enumerates a UUID can read any order's full details including customer email, phone, addresses.
- **Fix:** Remove `@Public()`. Add ownership guard (`customerId === req.user.userId`) or remove entirely if not needed publicly.
- **Effort:** S

#### B-06: `me/by-number/:orderNumber` Lacks `@Roles` Decorator — Fail-Closed Denies All
- **Location:** [customer-orders.controller.ts:64-70](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L64-L70)
- **Evidence:** The `getMyOrderByNumber` endpoint has no `@Public()` or `@Roles(...)` decorator. RolesGuard is fail-closed (line 30-33 of `roles.guard.ts`): it throws ForbiddenException for unannotated routes. This endpoint is **inaccessible to everyone**.
- **Impact:** Feature is dead. Customers cannot look up their orders by number.
- **Fix:** Add `@Roles(ROLES.CUSTOMER)`.
- **Effort:** S

### 🟠 HIGH

#### H-01: `?admin=true` Query Param Bypasses Product Visibility
- **Location:** [products.controller.ts:176-185](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/products/products.controller.ts#L176-L185)
- **Evidence:** `@Public() @Get('all-products')` reads `const isAdmin = admin === 'true'` from query params. No auth check. Passes `isAdmin=true` to service which returns draft/archived products.
- **Impact:** Draft products (pre-launch, pricing experiments) visible to anyone. Competitive intelligence leak.
- **Fix:** Remove `admin` query param from public endpoints. Create separate `@Roles(ROLES.EDITOR)` admin endpoint.
- **Effort:** S

#### H-02: JWT Strategy Does Not Verify User Liveness
- **Location:** [jwt.strategy.ts:16-18](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/auth/strategies/jwt.strategy.ts#L16-L18)
- **Evidence:** `validate()` returns `{ userId: payload.sub, email: payload.email, role: payload.role }` directly from the token payload. No DB lookup. If a user is deleted or `isActive=false`, their token works for up to 1 hour.
- **Impact:** Fired employees retain full access for up to 1 hour. Deactivated accounts can operate.
- **Fix:** Add `PrismaService.user.findUnique()` in `validate()`, check `isActive`, throw `UnauthorizedException` if not.
- **Effort:** S

#### H-03: Webhook State Regression — Order Status Can Go Backwards
- **Location:** [payments.service.ts:349-355](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L349-L355)
- **Evidence:** `handlePaymentCapturedWebhook` sets `status: OrderStatus.paid` without checking the current status against `ALLOWED_TRANSITIONS`. If order is already `shipped` or `delivered`, a delayed webhook regresses it to `paid`.
- **Impact:** Shipped/delivered orders revert to `paid`, corrupting order state for fulfillment and customer visibility.
- **Fix:** Add status check: skip update if order status is already past `paid` in the lifecycle.
- **Effort:** S

#### H-04: Webhook Idempotency Broken on Missing Event ID
- **Location:** [payments.service.ts:197-200](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L197-L200)
- **Evidence:** `const razorpayEventId = payload?.id || payload?.event_id || \`evt_${Date.now()}_${Math.random()...}\`` — If the Razorpay payload is missing both `id` and `event_id`, a random ID is generated, defeating the `@unique` constraint. Duplicate payloads process multiple times.
- **Impact:** Double-capture, double-refund, double-email on webhook replay.
- **Fix:** Reject webhooks with missing event IDs. Never generate synthetic IDs.
- **Effort:** S

#### H-05: Coupon Discount Applied Without Entering a Code
- **Location:** [clubbing.service.ts:213-244](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/clubbing/clubbing.service.ts#L213-L244)
- **Evidence:** `calculateCartDiscount` applies **all** active clubbing rules that match criteria. It does not check `couponCode`. Users receive discounts automatically without entering any code.
- **Impact:** All clubbing-rule-based discounts leak as automatic price reductions. Coupon codes become meaningless.
- **Fix:** Separate "auto-apply" rules from "coupon-code" rules. Only apply coupon rules when the matching code is provided.
- **Effort:** M

#### H-06: Coupon Slots Permanently Consumed on Payment Failure
- **Location:** [orders.service.ts:210-222](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L210-L222)
- **Evidence:** On order creation, `usage_count` is atomically incremented. On cancellation (line 393-398), it's decremented. But on `payment.failed`, the order stays `payment_pending` and the slot is never released.
- **Impact:** Abandoned checkouts permanently exhaust coupon usage limits, blocking legitimate customers.
- **Fix:** Decrement `usage_count` in `handlePaymentFailedWebhook`, or add a TTL-based cleanup for stale `payment_pending` orders.
- **Effort:** M

#### H-07: No `helmet()` Security Headers
- **Location:** [main.ts](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts)
- **Evidence:** `main.ts` does not call `app.use(helmet())`. No `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.
- **Impact:** Missing headers enable MIME-sniffing, clickjacking, and downgrade attacks.
- **Fix:** `npm install helmet` and add `app.use(helmet())` in `main.ts`.
- **Effort:** S

#### H-08: No Rate Limiting on Auth/Payment Endpoints
- **Location:** [main.ts](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts), [app.module.ts](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/app.module.ts)
- **Evidence:** No `ThrottlerModule` import or configuration. `POST /auth/login` and `POST /auth/register` are fully public with no rate limiting.
- **Impact:** Credential stuffing, brute-force attacks, and order-creation spam.
- **Fix:** Add `@nestjs/throttler` with sensible limits (e.g., 5 login attempts/minute per IP).
- **Effort:** S

#### H-09: CORS Wildcard in Non-Production
- **Location:** [main.ts:27](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/main.ts#L27)
- **Evidence:** `if (isAllowed || process.env.NODE_ENV !== 'production')` — If `NODE_ENV` is undefined or misspelled (e.g., `Production`), all origins are allowed.
- **Impact:** CORS bypass on staging/production if `NODE_ENV` isn't set exactly to `'production'`.
- **Fix:** Default to deny. Only allow listed origins. Fail closed if `NODE_ENV` is not explicitly set.
- **Effort:** S

#### H-10: Payment Verification Skipped When `keySecret` Is Empty
- **Location:** [payments.service.ts:131](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L131)
- **Evidence:** `if (RAZORPAY_CONFIG.keySecret) { ... verify ... }` — If `RAZORPAY_KEY_SECRET` env var is not set, signature verification is entirely skipped.
- **Impact:** In production without the env var, anyone can mark any order as paid by calling `/payments/verify` with fabricated data.
- **Fix:** Throw if `keySecret` is not set in production. Never skip signature verification.
- **Effort:** S

#### H-11: Storefront Middleware Blocks All Customer Auth Routes
- **Location:** [middleware.js:12-17](file:///c:/Users/andre/Desktop/projects/sridattam/middleware.js#L12-L17)
- **Evidence:** Lines 12-13 redirect `/account/*` to `/track-order`. Lines 15-17 redirect `/login` and `/register` to `/`. Customer login, registration, and account access are completely blocked on the storefront.
- **Impact:** No customer can log in, register, or view their account on the storefront. Only guest checkout and guest order tracking work.
- **Fix:** Remove/conditional-gate these redirects. They appear to be temporary "suspended auth" during migration.
- **Effort:** S

#### H-12: Hardcoded JWT Fallback Secrets
- **Location:** [jwt.config.ts:7,12](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/auth/jwt.config.ts#L7-L12)
- **Evidence:** `process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026'` and `process.env.JWT_REFRESH_SECRET || 'sridattam-dev-jwt-refresh-secret-key-2026'`
- **Impact:** If env vars are missing in production, the hardcoded secrets are used. These are public in the source code.
- **Fix:** Throw on startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` is not set. Never provide fallback secrets.
- **Effort:** S

#### H-13: Webhook Signature Fallback to `JSON.stringify`
- **Location:** [payments.controller.ts:46-48](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.controller.ts#L46-L48)
- **Evidence:** If `req.rawBody` is absent, falls back to `JSON.stringify(body || {})`. Express body-parser may reorder JSON properties, breaking the cryptographic signature.
- **Impact:** Webhook signature verification may fail silently, or an attacker could craft payloads that pass verification against the stringified (reordered) body.
- **Fix:** Require `rawBody`. Reject webhook if `rawBody` is unavailable.
- **Effort:** S

### 🟡 MEDIUM

#### M-01: `npm audit` — 20 Known Vulnerabilities
- **Backend:** 10 vulnerabilities (1 moderate, 9 high) — multer DoS (5 CVEs), mysql2 credential leak, js-yaml CPU, qs bypass
- **Frontend:** 10 vulnerabilities (1 low, 2 moderate, 6 high, 1 critical) — nodemailer DoS/credential issues (6 CVEs), postcss XSS/path traversal (4 CVEs), uuid buffer overflow

#### M-02: Duplicate Schema File
- **Location:** `backend/src/prisma/schema.prisma`
- **Impact:** Risk of editing the wrong file and silent divergence.

#### M-03: Redis Cache Module Unused
- **Location:** [cache.service.ts](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/redis/cache.service.ts)
- **Evidence:** `CacheService` has well-written get/set/invalidate and fail-open logic, but is never injected into any service. Catalog endpoints hit Postgres directly.
- **Impact:** No caching benefit. Redis infrastructure cost with no return.

#### M-04: Missing DB Indexes
- **Location:** [schema.prisma](file:///c:/Users/andre/Desktop/projects/sridattam/backend/prisma/schema.prisma)
- **Evidence:** `AuditLog` lacks indexes on `entityId`/`entityType` (lines 382-397). `PaymentWebhookEvent.paymentId` has no index (line 308). `CartItem` lacks `@@unique([cartId, productId])` (line 179-191).
- **Impact:** Slow queries at scale; duplicate cart items possible.

#### M-05: Order Number Fallback Uses Random Numbers
- **Location:** [orders.service.ts:645-648](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L645-L648)
- **Evidence:** If the PG sequence fails, fallback uses `1000 + count + Math.floor(Math.random() * 100)`. This can produce duplicate order numbers under concurrency.
- **Impact:** Non-unique order numbers; customer confusion.

#### M-06: Floating-Point Arithmetic for Currency
- **Location:** Multiple files: [orders.service.ts:125-126](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L125-L126), checkout page, cart context
- **Evidence:** `subtotal += lineTotal` uses JS `Number` addition. Frontend uses `parseFloat()` throughout.
- **Impact:** Penny rounding errors on large orders. `0.1 + 0.2 !== 0.3` problem.

#### M-07: Docker Compose Exposes All Ports Externally
- **Evidence:** PostgreSQL (5432) and Redis (6379) are bound to `0.0.0.0`. In production, these should only be accessible within the Docker network.

#### M-08: `ROLE_LABELS` in Frontend Maps Every Role to `'Customer'`
- **Location:** [roles.js:23-29](file:///c:/Users/andre/Desktop/projects/sridattam/lib/roles.js#L23-L29)
- **Evidence:** `admin: 'Customer', editor: 'Customer', read_only: 'Customer'`
- **Impact:** If admin portal shares this config, admin users see "Customer" as their role label.

#### M-09: `getRoleLabel()` Unconditionally Returns `'Customer'`
- **Location:** [roles.js:98-100](file:///c:/Users/andre/Desktop/projects/sridattam/lib/roles.js#L98-L100)
- **Evidence:** `export function getRoleLabel(role) { return 'Customer'; }`

#### M-10: Login Page Hardcodes `role: 'read_only'`
- **Location:** `app/login/page.js` (per subagent evidence)
- **Evidence:** Login page assigns hardcoded mock role on client side.

### 🟢 LOW

#### L-01: Hardcoded Testimonials on Home Page
- **Location:** `app/page.js` (lines 240-263 per subagent evidence)
- **Evidence:** `const testimonials = [{ name: 'Anjali R.', ... }]` — fake/fabricated social proof.

#### L-02: `lib/products-seed.js` Contains Mock Product Data
- **Location:** [products-seed.js](file:///c:/Users/andre/Desktop/projects/sridattam/lib/products-seed.js)

#### L-03: `lib/wc.js` WooCommerce Client Still Present (406 lines)
- **Location:** [wc.js](file:///c:/Users/andre/Desktop/projects/sridattam/lib/wc.js)
- **Evidence:** Full WooCommerce REST API client with product/order/category/variation helpers. Still referenced by the proxy route.

#### L-04: No Structured Logging
- **Evidence:** `main.ts` uses `console.log` for startup. No Winston/Pino configured.

---

## 4. ROUTE × ROLE AUTHORIZATION MATRIX

> [!NOTE]
> Guards: `JwtAuthGuard` + `RolesGuard` via `APP_GUARD` in [app.module.ts:46-47](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/app.module.ts#L46-L47). RolesGuard is **fail-closed** (denies routes without decorators).

| Route | Method | Decorator | Anonymous | Customer | Read-Only | Editor | Admin | Issues |
|---|---|---|---|---|---|---|---|---|
| `auth/register` | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | Safe: role forced to `customer` |
| `auth/login` | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | No rate limiting |
| `auth/refresh` | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | Checks `type: 'refresh'` ✅ |
| `auth/change-password` | PATCH | *(none)* | ❌ | ❌ | ❌ | ❌ | ❌ | **DEAD** — fail-closed denies all. Missing `@Roles(CUSTOMER)` |
| `all-products` | GET | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ `?admin=true` leaks drafts |
| `products/:id` | GET | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ `?admin=true` leaks drafts |
| `admin/products/*` | POST/PATCH/DELETE | `@Roles(EDITOR)` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `admin/products/upload-image` | POST | `@Roles(EDITOR)` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ mime/size validated |
| `admin/products/delete-image` | DELETE | `@Roles(EDITOR)` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `orders` (POST) | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔴 **B-01** forged identity |
| `orders/track` | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | OK (requires phone match) |
| `orders/me` | GET | `@Roles(CUSTOMER)` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ (ownership via `req.user.userId`) |
| `orders/me/by-number/:num` | GET | *(none)* | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 **B-06** inaccessible |
| `orders/me/:id` | GET | *(none)* | ❌ | ❌ | ❌ | ❌ | ❌ | **DEAD** — fail-closed |
| `orders/:id` | GET | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | 🔴 **B-05** full IDOR |
| `admin/orders` | GET | `@Roles(READ_ONLY)` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `admin/orders/:id/status` | PATCH | `@Roles(READ_ONLY)` | ❌ | ❌ | ✅ | ✅ | ✅ | ⚠️ read_only can change status |
| `payments/create-session` | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | OK (requires valid orderId) |
| `payments/verify` | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Skips verify if no secret |
| `payments/webhook` | POST | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ H-04, H-13 |
| `admin/payments` | GET | `@Roles(READ_ONLY)` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `admin/users` | GET | `@Roles(ADMIN)` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `admin/users/*` | POST/PATCH | `@Roles(ADMIN)` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `audit-logs` | GET | `@Roles(ADMIN)` exact | ❌ | ❌ | ❌ | ❌ | ✅ | ⚠️ Uses rank-based comparison, not exact |
| `admin/discounts/*` | ALL | `@Roles(EDITOR)` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `discounts/active` | GET | `@Public()` | ✅ | ✅ | ✅ | ✅ | ✅ | OK for storefront coupon check |

> [!WARNING]
> The `RolesGuard` uses **rank-based comparison** (`getRoleRank(user) >= getRoleRank(required)`), not exact role matching. This means `@Roles(ROLES.READ_ONLY)` allows `editor` and `admin` too. For audit logs, this means editors can also access them, which may or may not be intended.

---

## 5. END-TO-END JOURNEY RESULTS

> [!IMPORTANT]
> The backend does not compile (B-03), so runtime testing against a running server was not possible. All journey assessments are based on code analysis.

| Step | Status | Evidence |
|---|---|---|
| Guest browse products | ✅ PASS (code) | `GET /all-products` is `@Public()`, product list renders |
| View product detail | ✅ PASS (code) | `GET /products/:slug` is `@Public()` |
| Add to cart | ✅ PASS (code) | Cart is client-side `localStorage` via `cart-context.js` |
| Apply coupon | ⚠️ PARTIAL | Coupon validation queries backend, but auto-applies all rules (H-05) |
| Checkout → create order | 🔴 FAIL | `shippingTotal` client-trusted (B-02); identity forgeable (B-01) |
| Create payment session | ✅ PASS (code) | Idempotent; returns existing CREATED session |
| Razorpay payment | ⚠️ PARTIAL | Mock gateway fallback if keys missing; signature skip if no secret (H-10) |
| Payment verify → order paid | ⚠️ PARTIAL | Works when secret is present; skips verify otherwise |
| Order confirmation page | ✅ PASS (code) | Reads from NestJS `GET /orders/:id` (but that's IDOR — B-05) |
| Email notification | ⚠️ PARTIAL | `ConsoleEmailProvider` logs to console only; no real SMTP |
| Customer login/register | 🔴 FAIL | Middleware redirects `/login` and `/register` away (H-11) |
| Customer views orders | 🔴 FAIL | Middleware redirects `/account/*` away (H-11) |
| Admin: update order status | ✅ PASS (code) | State machine enforced; history written |
| Guest track order | ✅ PASS (code) | `POST /orders/track` with phone/email matching |

---

## 6. LEGACY PARITY TABLE

| Legacy Feature | Status | Evidence |
|---|---|---|
| **Tax by billing address (multi-class)** | ❌ Missing | `taxTotal` is hardcoded to `0` in [orders.service.ts:232](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/orders.service.ts#L232). No tax calculation exists. |
| **Coupons (freeship, sristart9, sri1st, start10)** | ⚠️ Partial | Clubbing rules exist but auto-apply without codes (H-05). No free-shipping coupon type. |
| **Bundle clubbing (distinct from coupons)** | ✅ Implemented | `ClubbingService.calculateCartDiscount` handles `fixed_price_bundle` and `percentage_off_bundle` |
| **Delhivery courier + tracking IDs** | ❌ Missing | No Delhivery integration. `OrderStatusHistory` has no tracking fields. `UpdateOrderStatusDto` has `trackingNumber`/`trackingLink` but they are not persisted to any model. |
| **PDF invoices** | ❌ Missing | No PDF generation library or endpoint |
| **Cart abandonment tracking + recovery emails** | ❌ Missing | `Cart` model has `abandoned` status enum but no cron/job to detect or email |
| **Failed vs Cancelled order status** | ⚠️ Needs decision | `OrderStatus` enum has `cancelled` but no `failed`. Payment failure leaves order in `payment_pending`. Legacy WooCommerce had separate `failed` and `cancelled` states. Impact: analytics can't distinguish user-cancelled from payment-failed. |
| **Guest checkout** | ✅ Implemented | Works via `@Public()` order creation (but with security issues B-01, B-02) |
| **Transactional emails** | ⚠️ Partial | Event listeners exist for `order.created`, `order.paid`, `order.processing`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded`, `payment.failed`. Templates are HTML strings. Only `ConsoleEmailProvider` (logs to console). No real SMTP provider configured. |
| **Admin analytics basics** | ⚠️ Partial | `AnalyticsModule` exists with overview and order-status endpoints. Dashboard component in admin-portal fetches real data. |
| **Category tree (hierarchy)** | ✅ Implemented | `Category` model has `parentId` self-relation. |
| **Attributes/variants** | ✅ Implemented | `Product.variations` JSONB with `productType: variable`. Order items snapshot `variantId` + `attributesSnapshot`. |
| **Category cycle prevention** | Unverified | Could not find explicit cycle detection in category service. |
| **Category FK-safe delete** | Unverified | No `onDelete` specified on Category self-relation (Prisma default is `SetNull` for optional). Products have required `categoryId` with no cascade — delete will fail on FK constraint (safe). |

---

## 7. MOCK/FAKE/HARDCODED DATA INVENTORY

| Item | Location | Description |
|---|---|---|
| Fake testimonials | `app/page.js:240-263` | Hardcoded `testimonials` array with fabricated customer names and reviews |
| Mock product seed | [products-seed.js](file:///c:/Users/andre/Desktop/projects/sridattam/lib/products-seed.js) | Frontend mock product data file |
| Mock payment gateway | [payments.service.ts:56-75](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/payments/payments.service.ts#L56-L75) | Returns `isMock: true` with `rzp_test_mock` key when Razorpay keys not configured |
| Mock payment flow | [checkout/page.js:333-357](file:///c:/Users/andre/Desktop/projects/sridattam/app/checkout/page.js#L333-L357) | Full mock payment modal with fake verification |
| Docker DB credentials | [docker-compose.yml:20-22,41-43](file:///c:/Users/andre/Desktop/projects/sridattam/docker-compose.yml#L20-L43) | `sridattam_admin` / `[REDACTED]` in plaintext |
| Hardcoded JWT secrets | [jwt.config.ts:7,12](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/auth/jwt.config.ts#L7-L12) | Dev fallback secrets in source code |
| `getRoleLabel()` stub | [roles.js:98-100](file:///c:/Users/andre/Desktop/projects/sridattam/lib/roles.js#L98-L100) | Always returns `'Customer'` |
| `ROLE_LABELS` all `'Customer'` | [roles.js:23-29](file:///c:/Users/andre/Desktop/projects/sridattam/lib/roles.js#L23-L29) | Every role maps to `'Customer'` |

---

## 8. UNVERIFIED ITEMS

| Item | Reason |
|---|---|
| Runtime HTTP testing (all phases) | Backend does not compile (B-03). Cannot start server. |
| Docker Compose `up` clean start | Cannot test without running Docker engine and fixing build. |
| Database migrations apply cleanly | Would need running PostgreSQL and working Prisma CLI. |
| Seed script works | Same as above. |
| R2 image reachability | No R2 credentials or running environment. |
| Product data migration (14 SKUs) | Cannot query database without running stack. |
| Razorpay end-to-end payment flow | No Razorpay test keys configured. |
| Email delivery | Only `ConsoleEmailProvider` exists; no SMTP configured. |
| Concurrent coupon redemption race | Requires running server with multiple clients. |
| Redis fail-open behavior | Requires stopping Redis while server is running. |
| XSS via `dangerouslySetInnerHTML` | Product description sanitization exists in backend (`sanitize-html`), but couldn't test with live payloads. |
| Next.js `app/api/[[...path]]` proxy behavior | Could not test routing without running Next.js dev server. |
| Admin portal cross-domain auth/CORS | Admin portal is a separate app; couldn't test cookie/session sharing. |
| HTML sanitization allowlist review | `sanitize-html` is imported in `products.service.ts` but exact allowlist config not fully audited. |
| Category cycle prevention | Could not find explicit cycle detection code; may rely on DB constraints. |
| `GET /audit-logs` exact-match vs rank-based | RolesGuard uses rank-based comparison globally; audit-logs controller reportedly adds an explicit `role.toLowerCase() !== ROLES.ADMIN` check but this could not be runtime-verified. |

---

## 9. OPEN QUESTIONS (Require Human/Business Decision)

1. **Failed vs Cancelled order status:** Should the schema add a `failed` enum value to distinguish payment failures from user/admin cancellations? The legacy WooCommerce system separated these. Current behavior: payment failure leaves order in `payment_pending` indefinitely.

2. **Customer auth on storefront:** The middleware currently blocks `/login`, `/register`, and `/account/*`. Is this intentional "phase 1 guest-only" or a bug? When should customer auth be re-enabled?

3. **Tax calculation:** Legacy WooCommerce computed tax by billing address with multiple tax classes. The new system hardcodes `taxTotal: 0`. Is Sridattam currently tax-exempt, or does tax need to be implemented before launch?

4. **Audit log access for editors:** The rank-based RolesGuard allows `editor` (rank 2) to access audit logs protected at `@Roles(ADMIN)` (rank 3). Wait — actually `@Roles(ADMIN)` requires rank 3, and editor is rank 2, so editors are denied. However, `@Roles(READ_ONLY)` on `admin/orders/:id/status` PATCH allows read_only users to **change** order status. Is this intended?

5. **WooCommerce dependency:** `lib/wc.js` (406 lines) and the `app/api/[[...path]]` proxy are still present. Is WooCommerce still needed for any reads (product images, legacy order lookup)? When can it be fully removed?

6. **Mock payment gateway:** The mock Razorpay flow is active when keys are not set. In production, should the app refuse to start if `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are empty?

7. **Email provider:** Production needs a real SMTP provider (SES, Resend, Mailgun). Which service is planned? The `EMAIL_PROVIDER` env var defaults to `"console"`.

8. **Backup strategy:** No `pg_dump` script or backup cron exists. What's the backup plan for PostgreSQL?

---

## 10. PRIORITIZED FIX LIST

### 🔴 MUST FIX BEFORE LAUNCH (Blockers + High Security)

| Priority | ID | Title | Effort | Dependencies |
|---|---|---|---|---|
| 1 | B-03 | Fix build: add `prisma generate` to build chain | S | None |
| 2 | B-04 | Add global `ValidationPipe` with whitelist | S | B-03 |
| 3 | B-01 | Fix order creation auth: remove `@Public()`, stop accepting `customerId` from body | S | B-03 |
| 4 | B-02 | Remove `shippingTotal` from client DTO; compute server-side | S | B-03 |
| 5 | B-05 | Remove `@Public()` from `GET /orders/:id` or add ownership check | S | B-03 |
| 6 | B-06 | Add `@Roles(CUSTOMER)` to `me/by-number` and `me/:id` | S | B-03 |
| 7 | H-10 | Fail on missing `RAZORPAY_KEY_SECRET` in production | S | B-03 |
| 8 | H-12 | Fail on missing JWT secrets in production | S | B-03 |
| 9 | H-02 | JWT strategy: verify user exists and `isActive` in DB | S | B-03 |
| 10 | H-03 | Webhook: check order status before regressing to `paid` | S | B-03 |
| 11 | H-04 | Reject webhooks with missing event IDs | S | B-03 |
| 12 | H-13 | Require `rawBody` for webhook signature; reject if absent | S | B-03 |
| 13 | H-07 | Add `helmet()` | S | B-03 |
| 14 | H-08 | Add `@nestjs/throttler` on auth/payment endpoints | S | B-03 |
| 15 | H-09 | Fix CORS to fail-closed; require explicit `NODE_ENV=production` | S | B-03 |
| 16 | H-01 | Remove `?admin=true` from public product endpoints | S | B-03 |
| 17 | H-11 | Remove/gate middleware auth redirects | S | Business decision #2 |

### 🟡 POST-LAUNCH (But Soon)

| Priority | ID | Title | Effort | Dependencies |
|---|---|---|---|---|
| 18 | H-05 | Separate auto-apply rules from coupon-code rules | M | B-03 |
| 19 | H-06 | Release coupon slots on payment failure | M | B-03 |
| 20 | M-01 | Resolve npm audit vulnerabilities (multer, nodemailer, postcss) | M | None |
| 21 | M-04 | Add missing DB indexes (AuditLog entity, PaymentWebhookEvent, CartItem unique) | S | B-03 |
| 22 | M-05 | Fix order number fallback to prevent duplicates | S | B-03 |
| 23 | M-06 | Use `Decimal.js` or integer paise for currency math | M | B-03 |
| 24 | M-07 | Bind Postgres/Redis ports to internal network only in production compose | S | None |
| 25 | M-02 | Remove duplicate schema file | S | None |
| 26 | M-03 | Wire up `CacheService` to catalog endpoints | M | B-03 |
| 27 | L-01 | Replace hardcoded testimonials with real data or remove | S | None |
| 28 | L-03 | Plan WooCommerce removal timeline | M | Business decision #5 |
| 29 | — | Set up CI pipeline (build + test gate) | M | B-03 |
| 30 | — | Implement tax calculation | L | Business decision #3 |
| 31 | — | Configure real email provider | M | Business decision #7 |
| 32 | — | Set up pg_dump backup strategy | S | Business decision #8 |
| 33 | — | Add health-check endpoint (`/health`) | S | B-03 |
| 34 | — | Add structured logging (Pino/Winston) | M | B-03 |
| 35 | — | Implement Delhivery tracking integration | L | None |
| 36 | — | Implement PDF invoices | M | None |

---

*Report generated 2026-10-03 via automated deep audit. All findings based on code analysis; runtime verification blocked by build failure (B-03). Re-run audit after fixing blockers to validate runtime behavior.*
