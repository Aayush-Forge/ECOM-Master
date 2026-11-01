# SRIDATTAM E-COMMERCE PLATFORM — MASTER QA TEST REPORT

**Date:** 2026-11-01  
**Lead QA Engineer:** Senior Staff QA & Verification Engineer  
**Tested Stack:** Next.js 14 Storefront (Port 3000), Next.js 16 Admin Portal (Port 3001), NestJS 11 REST API (Port 5000), PostgreSQL 15, Redis 7 (BullMQ), Razorpay Test Mode  
**Git Branch:** `testing-draft-2`  
**Overall Verdict:** 🔴 **NOT READY FOR PRODUCTION (NO-GO)**

---

## 1. EXECUTIVE SUMMARY

An exhaustive, evidence-backed quality assurance audit was conducted against the entire Sridattam monorepo. Every test recorded in this report was executed against the live, running multi-tier stack (Storefront on `:3000`, Admin Portal on `:3001`, NestJS Backend on `:5000`, PostgreSQL on `:5432`, and Redis on `:6379`) using real HTTP requests, database transactions, cryptographic HMAC signatures, and Playwright browser automation.

Significant architectural improvements have been verified since the previous audit cycle:
1. **Server-Side Price Authority**: Client-tampered `shippingTotal` (e.g. sending `-5000`) and client-submitted item prices are completely ignored by `OrdersService`; grand totals are computed authoritatively on the server.
2. **Order Authentication & Guest Isolation**: `POST /orders` no longer permits forged client IDs and binds orders strictly to authenticated user tokens or pure guest carts.
3. **Category Cycle Detection**: Circular category parent-child hierarchies ($A \to B \to A$) are dynamically detected via ancestor traversal and rejected with HTTP 400.
4. **Maintenance Mode**: Recently added site maintenance toggle (`/site-status`, `BlockDuringMaintenanceGuard`, and `middleware.js`) reliably blocks cart creation and order submission with HTTP 503 while allowing admin management.
5. **Fixture Controller Isolation**: The dangerous test fixture controller (`SampleMutationsFixtureController` at `/test-mutations/*`) has been unmounted from `AuditLogsModule` in production.

However, several **Critical and High severity vulnerabilities, broken test suites, unhandled pagination crashes, stored XSS, and architectural documentation conflicts** prevent production sign-off.

### Defect Count by Severity

| Severity | Count | Summary |
|:---|:---:|:---|
| **Critical** | 4 | Public PII / Invoice leak, hardcoded cloud credentials, historical audit test suite crash, dependency critical CVEs |
| **High** | 7 | Unhandled 500 on negative/zero pagination, broken e2e test suite, admin lint failure, UI pointer event interception, missing address max length, lack of admin nav for invoices |
| **Medium** | 8 | Stored XSS in customer address, lack of rate limiting on exempted routes, documentation conflicts on customer accounts, duplicate schema files |
| **Low** | 4 | Outdated browserlist data, minor Tailwind CSS warning, hardcoded local database password in docker-compose.yml |
| **Total** | **23** | |

### Top 10 Risks

1. **🔴 [CRIT-01] Unauthenticated PII & Financial Disclosure on `GET /orders/:id/invoice` and `GET /orders/:id/shipping-label`**: Both endpoints are marked `@Public()` without authentication or customer ownership checks. Any external visitor with an order UUID can view full customer names, physical addresses, phone numbers, item snapshots, invoice numbers, and financial totals.
2. **🔴 [CRIT-02] Hardcoded Cloudflare R2 Credentials in `deploy.sh`**: The automated deployment script contains a live Cloudflare R2 Secret Access Key (`d99b25a7df049e93750190476de031bb34e727c435bffc22cfa365a4aa66e54a`) in plaintext in git history.
3. **🔴 [CRIT-03] Broken Backend Unit Test Suites (`npm test` failing 2 suites)**: `npm test` fails in `cart.controller.spec.ts` (`BlockDuringMaintenanceGuard` missing `SiteStatusService` dependency) and `clubbing.service.spec.ts` (`prisma.product` undefined mock).
4. **🔴 [CRIT-04] Severe Vulnerabilities in Frontend Dependencies (`npm audit`)**: Next.js 14.2.3 and Next.js 16.3.4 contain critical CVEs (RCE in Image Optimization / next/og, Cache Poisoning, SSRF in Middleware).
5. **🟠 [HIGH-01] Unhandled HTTP 500 Crashes on Pagination Boundaries**: `GET /products?page=-1`, `GET /admin/orders?page=0`, and `GET /admin/payments?page=0` crash with unhandled 500 Internal Server Error due to negative Prisma `skip` offset calculation.
6. **🟠 [HIGH-02] Broken Backend E2E Test Suite (`npm run test:e2e`)**: `test/app.e2e-spec.ts` fails to run due to missing `.js` extension resolver in Jest e2e configuration.
7. **🟠 [HIGH-03] Broken Admin Portal Lint Command (`npm run lint`)**: `npm run lint` in `admin-portal` fails immediately with `Invalid project directory provided: .../admin-portal/lint`.
8. **🟠 [HIGH-04] Storefront UI Click Interception on Header Elements**: The decorative atmosphere image in `<section class="... z-10">` on the storefront homepage intercepts pointer events, preventing normal clicks on header buttons like "Open cart".
9. **🟡 [MED-01] Stored XSS in Customer Address Book**: `POST /addresses/me` accepts raw script tags (`<script>alert('XSS')</script>`) without sanitization or HTML entity escaping and stores them in PostgreSQL.
10. **🟡 [MED-02] Architectural Conflict: Documented Storefront Customer Accounts vs Implemented Guest Checkout**: The README advertises `/account` (profile, address book, past orders) and `/register`, but `middleware.js` explicitly redirects all `/account` and `/register` requests to `/`, stating customer accounts do not exist.

---

## 2. INVENTORY

### 2.1 Backend API Endpoints (133 Endpoints Discovered across 25 Controllers)

| Method | Endpoint Path | Controller | Guard / Role | Status |
|:---|:---|:---|:---|:---:|
| `GET` | `/` | `AppController` | `@Public()` | PASS |
| `GET` | `/health` | `AppController` | `@Public()`, `@SkipThrottle()` | PASS |
| `GET` | `/admin/accounting/summary` | `AccountingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/admin/accounting/daily-breakdown` | `AccountingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/admin/accounting/orders` | `AccountingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/admin/accounting/export-csv` | `AccountingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/addresses/me` | `AddressesController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `POST` | `/addresses/me` | `AddressesController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `PATCH` | `/addresses/me/:id` | `AddressesController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `DELETE` | `/addresses/me/:id` | `AddressesController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `PATCH` | `/addresses/me/:id/default` | `AddressesController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `GET` | `/admin/analytics/overview` | `AnalyticsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/analytics/top-products` | `AnalyticsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/analytics/top-categories` | `AnalyticsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/analytics/coupons` | `AnalyticsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/analytics/operational` | `AnalyticsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/audit-logs` | `AuditLogsController` | `@Roles(ROLES.ADMIN)` | PASS |
| `POST` | `/auth/register` | `AuthController` | `@Public()` | PASS |
| `POST` | `/auth/login` | `AuthController` | `@Public()` | PASS |
| `POST` | `/auth/refresh` | `AuthController` | `@Public()` | PASS |
| `POST` | `/auth/change-password` | `AuthController` | Authenticated | PASS |
| `POST` | `/cart` | `CartController` | `@Public()`, `BlockDuringMaintenanceGuard` | PASS |
| `GET` | `/cart/:id` | `CartController` | `@Public()`, `BlockDuringMaintenanceGuard` | PASS |
| `POST` | `/cart/:id/items` | `CartController` | `@Public()`, `BlockDuringMaintenanceGuard` | PASS |
| `PATCH` | `/cart/:id/items/:itemId` | `CartController` | `@Public()`, `BlockDuringMaintenanceGuard` | PASS |
| `DELETE` | `/cart/:id/items/:itemId` | `CartController` | `@Public()`, `BlockDuringMaintenanceGuard` | PASS |
| `DELETE` | `/cart/:id` | `CartController` | `@Public()`, `BlockDuringMaintenanceGuard` | PASS |
| `POST` | `/admin/create-categories` | `CategoriesController` | `@Roles(ROLES.EDITOR)` | PASS |
| `GET` | `/categories` | `CategoriesController` | `@Public()` | PASS |
| `GET` | `/admin/all-categories` | `CategoriesController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/categories/:id` | `CategoriesController` | `@Public()` | PASS |
| `GET` | `/admin/categories/:id` | `CategoriesController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `PATCH` | `/admin/update-categories/:id` | `CategoriesController` | `@Roles(ROLES.EDITOR)` | PASS |
| `DELETE` | `/admin/delete-categories/:id` | `CategoriesController` | `@Roles(ROLES.EDITOR)` | PASS |
| `GET` | `/clubbing-rules` / `/clubbing` | `ClubbingController` | `@Public()` | PASS |
| `POST` | `/clubbing-rules` / `/clubbing` | `ClubbingController` | `@Roles(ROLES.EDITOR)` | PASS |
| `GET` | `/clubbing-rules/:id` / `/clubbing/:id` | `ClubbingController` | `@Public()` | PASS |
| `PATCH` | `/clubbing-rules/:id` / `/clubbing/:id` | `ClubbingController` | `@Roles(ROLES.EDITOR)` | PASS |
| `DELETE` | `/clubbing-rules/:id` / `/clubbing/:id` | `ClubbingController` | `@Roles(ROLES.EDITOR)` | PASS |
| `POST` | `/clubbing-rules/upload-banner` | `ClubbingController` | `@Roles(ROLES.EDITOR)` | PASS |
| `POST` | `/clubbing-rules/bulk-status` | `ClubbingController` | `@Roles(ROLES.EDITOR)` | PASS |
| `POST` | `/clubbing-rules/bulk-delete` | `ClubbingController` | `@Roles(ROLES.EDITOR)` | PASS |
| `GET` | `/company-profile` | `CompanyProfileController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `PUT` | `/company-profile` | `CompanyProfileController` | `@Roles(ROLES.ADMIN)` | PASS |
| `POST` | `/company-profile/documents` | `CompanyProfileController` | `@Roles(ROLES.ADMIN)` | PASS |
| `DELETE` | `/company-profile/documents/:id` | `CompanyProfileController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/admin/customers` | `CustomersController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/customers/:phoneKey` | `CustomersController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/email/logs` | `AdminEmailLogsController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/admin/email/templates` | `AdminEmailTemplatesController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/admin/email/templates/:key` | `AdminEmailTemplatesController` | `@Roles(ROLES.ADMIN)` | PASS |
| `PATCH` | `/admin/email/templates/:key` | `AdminEmailTemplatesController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/orders/:id/invoice` | `CustomerOrdersController` | `@Public()` (NO AUTH) | **FAIL (PII Leak)** |
| `GET` | `/orders/:id/shipping-label` | `CustomerOrdersController` | `@Public()` (NO AUTH) | **FAIL (PII Leak)** |
| `POST` | `/orders` | `CustomerOrdersController` | `@Public()`, `BlockDuringMaintenanceGuard` | PASS |
| `POST` | `/orders/track` | `CustomerOrdersController` | `@Public()` | PASS |
| `GET` | `/orders/track` | `CustomerOrdersController` | `@Public()` | PASS |
| `GET` | `/orders/me` | `CustomerOrdersController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `GET` | `/orders/me/:id` | `CustomerOrdersController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `GET` | `/orders/:id` | `CustomerOrdersController` | `@Public()`, `OptionalJwtAuthGuard` | PASS |
| `GET` | `/admin/orders` | `OrdersController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/orders/:id` | `OrdersController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `PATCH` | `/admin/orders/:id/status` | `OrdersController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `POST` | `/admin/orders/:id/cancel` | `OrdersController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `POST` | `/payments/create-session` | `PaymentsController` | `@Public()` | PASS |
| `POST` | `/payments/verify` | `PaymentsController` | `@Public()` | PASS |
| `POST` | `/payments/fail` | `PaymentsController` | `@Public()` | PASS |
| `POST` | `/payments/webhook` | `PaymentsController` | `@Public()`, `@SkipThrottle()` | PASS |
| `GET` | `/admin/payments` | `PaymentsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `GET` | `/admin/payments/order/:orderId` | `PaymentsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `POST` | `/pricing/calculate` | `PricingController` | `@Public()` | PASS |
| `GET` | `/products` | `ProductsController` | `@Public()` | PASS |
| `GET` | `/products/:slug` | `ProductsController` | `@Public()` | PASS |
| `POST` | `/products` | `ProductsController` | `@Roles(ROLES.EDITOR)` | PASS |
| `PATCH` | `/products/:id` | `ProductsController` | `@Roles(ROLES.EDITOR)` | PASS |
| `DELETE` | `/products/:id` | `ProductsController` | `@Roles(ROLES.ADMIN)` | PASS |
| `POST` | `/reviews` | `ReviewsController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `GET` | `/reviews` | `ReviewsController` | `@Roles(ROLES.READ_ONLY)` | PASS |
| `PATCH` | `/reviews/:id/status` | `ReviewsController` | `@Roles(ROLES.EDITOR)` | PASS |
| `DELETE` | `/reviews/:id` | `ReviewsController` | `@Roles(ROLES.EDITOR)` | PASS |
| `GET` | `/shipping-templates` | `ShippingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `POST` | `/shipping-templates` | `ShippingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `PATCH` | `/shipping-templates/:id` | `ShippingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `DELETE` | `/shipping-templates/:id` | `ShippingController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/site-status` | `SiteStatusController` | `@Public()` | PASS |
| `PATCH` | `/admin/site-status` | `SiteStatusController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/admin/users` | `AdminUsersController` | `@Roles(ROLES.ADMIN)` | PASS |
| `POST` | `/admin/users` | `AdminUsersController` | `@Roles(ROLES.ADMIN)` | PASS |
| `PATCH` | `/admin/users/:id/role` | `AdminUsersController` | `@Roles(ROLES.ADMIN)` | PASS |
| `PATCH` | `/admin/users/:id/password` | `AdminUsersController` | `@Roles(ROLES.ADMIN)` | PASS |
| `GET` | `/users/me` | `UsersController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `PATCH` | `/users/me` | `UsersController` | `@Roles(ROLES.CUSTOMER)` | PASS |
| `*` | `/test-mutations/*` (10 routes) | `SampleMutationsFixtureController` | Unmounted in Module | **PASS (404 Disabled)** |

---

### 2.2 Data Transfer Objects (DTOs) & Database Models

* **43 DTOs**: `CreateAddressDto`, `UpdateAddressDto`, `LoginDto`, `RegisterDto`, `ChangePasswordDto`, `RefreshTokenDto`, `AddCartItemDto`, `UpdateCartItemDto`, `CreateCategoryDto`, `UpdateCategoryDto`, `CreateClubbingRuleDto`, `UpdateClubbingRuleDto`, `CreateOrderDto`, `UpdateOrderStatusDto`, `TrackOrderDto`, `RefundWebhookDto`, `CreatePaymentSessionDto`, `VerifyPaymentDto`, `RecordPaymentFailureDto`, `CreateProductDto`, `UpdateProductDto`, `CreateReviewDto`, `CreateShippingTemplateDto`, `UpdateSiteStatusDto`, `AdminUsersDto`, `UpdateProfileDto`, etc.
* **23 Prisma Models**: `Product`, `ShippingTemplate`, `Review`, `Category`, `ClubbingRule`, `ClubbingRuleProduct`, `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatusHistory`, `OrderAddress`, `Payment`, `PaymentWebhookEvent`, `User`, `Address`, `EmailTemplate`, `NotificationLog`, `ShippingSlab`, `AuditLog`, `CompanyProfile`, `CompanyDocument`, `SiteSetting`.
* **11 Prisma Enums**: `ProductStatus`, `ProductType`, `ClubbingRuleType`, `CartStatus`, `OrderStatus`, `OrderAddressType`, `PaymentStatus`, `PaymentWebhookStatus`, `UserRole`, `NotificationStatus`, `ShippingRateType`.
* **Queues & Jobs**: BullMQ queue named `notifications` processed by `NotificationWorker` / `NotificationProcessor` with idempotency deduplication on `NotificationLog.idempotencyKey`.
* **External Integrations**:
  * Razorpay Payment Gateway (Test Mode Key ID: `rzp_test_TeDsxH8VAgL0ZA`)
  * Cloudflare R2 Object Storage (`@aws-sdk/client-s3`)
  * Nodemailer (SMTP localhost:1025 with graceful console fallback)
  * Redis 7 Cache & BullMQ Queue (`localhost:6379`)
  * PostgreSQL 15 ACID Database (`localhost:5432`)

---

### 2.3 Frontend Routes & Pages

#### Storefront Pages (Port 3000 — 32 Pages)
* `/` (Homepage), `/products` (Catalog grid), `/products/[slug]` (Product detail & reviews), `/categories/[slug]` (Category landing), `/cart` (Cart drawer & page), `/checkout` (One-page Razorpay checkout), `/order-confirmation` (Post-purchase confirmation), `/track-order` (Order status timeline), `/about`, `/contact`, `/festive`, `/maintenance`, `/privacy-policy`, `/terms-conditions`, `/shipping-policy`, `/refund-policy`.
* **Redirected Routes (via `middleware.js`)**:
  * `/admin` $\rightarrow$ `http://localhost:3001`
  * `/staff/*` $\rightarrow$ `http://localhost:3001`
  * `/login` $\rightarrow$ `http://localhost:3001/login`
  * `/account/*` $\rightarrow$ `http://localhost:3000/`
  * `/register` $\rightarrow$ `http://localhost:3000/`

#### Admin Portal Pages (Port 3001 — 27 Pages)
* `/login` (Staff authentication), `/overview` (Analytics KPIs), `/orders` (Order management grid), `/orders/[id]` (Order operational detail), `/payments` (Financial transaction ledger), `/shipping` (Shipping zones & slabs), `/products` (Catalog management), `/products/new` (Add product), `/products/[id]/edit` (Edit product), `/categories` (Taxonomy tree), `/clubbings` (Bundle deals), `/clubbings/new`, `/clubbings/[id]/edit`, `/discounts` (Coupons), `/discounts/new`, `/discounts/[id]/edit`, `/reviews` (Moderation queue), `/customers` (Customer directory), `/customers/[phoneKey]` (Customer order history), `/accounting` (Financial summaries & CSV export), `/users` (Staff RBAC), `/company-profile` (Business info & GSTIN), `/email` (Notification templates & logs), `/site-status` (Maintenance mode toggle), `/audit-logs` (Administrative security logs), `/invoices-labels` (Bulk invoice printing).

---

## 3. COVERAGE AND VERIFICATION MATRIX

| Component / Element | Target Layer | Role Context | Status | Executed Evidence / Reason |
|:---|:---|:---|:---:|:---|
| Backend Auth Matrix (133 endpoints) | HTTP API | All 5 Roles | **PASS** | 931 HTTP requests executed; all guarded routes rejected missing/expired/tampered tokens with 401; RBAC properly enforced. |
| Customer Address IDOR | HTTP API | Customer A & B | **PASS** | User B attempts to update, delete, or setDefault User A's address returned HTTP 404. |
| Customer Order IDOR (`GET /orders/:id`) | HTTP API | Anonymous & Cust B | **PASS** | Anonymous and cross-customer queries returned HTTP 404 Not Found. |
| Order Creation Identity Forgery | HTTP API | Customer | **PASS** | `POST /orders` ignored client body `customerId` and bound order to JWT authenticated identity. |
| Order Public Invoices (`GET /orders/:id/invoice`) | HTTP API | Anonymous | **FAIL** | Returned HTTP 200 with full customer PII, phone, address, and purchase list without authentication. |
| Order Public Packing Slip (`GET /orders/:id/shipping-label`) | HTTP API | Anonymous | **FAIL** | Returned HTTP 200 with full shipping packing slip and customer PII without authentication. |
| Order Status State Machine (Legal chain) | HTTP API / DB | Admin | **PASS** | Successfully transitioned `payment_pending` $\rightarrow$ `paid` $\rightarrow$ `processing` $\rightarrow$ `shipped` $\rightarrow$ `delivered`. |
| Order Status State Machine (Illegal jumps) | HTTP API | Admin | **PASS** | `payment_pending` $\rightarrow$ `delivered` and `processing` $\rightarrow$ `delivered` rejected with 400. |
| Order Tracking Requirements | HTTP API | Admin | **PASS** | Transitioning to `shipped` without tracking URL rejected with HTTP 400. |
| Historical Order Immutability | HTTP API / DB | Customer / Admin | **PASS** | Updating product price from ₹109 to ₹309 left historical order total at ₹158 unchanged. |
| Out-of-Stock Purchasing Prevention | HTTP API | Customer | **PASS** | Ordering products with `stockQuantity: 0` rejected with HTTP 400 ("Product is not active"). |
| Draft Product Purchasing Prevention | HTTP API | Customer | **PASS** | Ordering draft products rejected with HTTP 400. |
| Server-Side Price & Shipping Recalculation | HTTP API | Customer | **PASS** | Sending `shippingTotal: -5000` and `price: 1` overridden by DB prices (grandTotal ₹158). |
| Razorpay Session Creation | HTTP API | Public / Guest | **PASS** | Returned valid `razorpayOrderId` (`order_TupSZK9yQ7YPxm`). Idempotency verified. |
| Razorpay Cryptographic Verification | HTTP API | Public / Guest | **PASS** | Valid HMAC SHA-256 returned HTTP 201; invalid signature returned HTTP 400. |
| Razorpay Payment Failure Tracking | HTTP API | Public / Guest | **PASS** | `POST /payments/fail` recorded failure in DB, kept status `payment_pending`, enabled retry. |
| Razorpay Webhook Signature Verification | HTTP API | Razorpay | **PASS** | Missing/invalid signature returned 400; valid signature processed order to `paid`; replay returned `already_processed`. |
| Category Circular Dependency Check | HTTP API | Admin | **PASS** | Attempting circular category parenting ($A \to B \to A$) rejected with HTTP 400. |
| Maintenance Mode Enforcement | HTTP API / Frontend | Admin / Customer | **PASS** | Enabling maintenance mode caused `POST /cart` to return 503 Service Unavailable. |
| Throttler Rate Limiting | HTTP API | Public | **PASS** | Sent 115 requests to `GET /`; request #101 triggered HTTP 429 Too Many Requests. |
| File Upload Restrictions | HTTP API | Editor | **PASS** | Uploading `malware.exe` to banner upload returned HTTP 400 (Unsupported file type). |
| Storefront Direct Route Protection | Browser (Playwright) | All Roles | **PASS** | `/admin` and `/staff` redirected to `:3001`; `/login` redirected to `:3001/login`; `/account` redirected to `/`. |
| Admin Portal Route Protection | Browser (Playwright) | All Roles | **PASS** | Unauthenticated and Customer redirected to `/login`; Read-Only and Editor restricted to allowed prefixes. |
| Responsive Layouts (375px, 768px, 1440px) | Browser (Playwright) | Customer | **PASS** | No horizontal overflow observed across viewports. |
| End-to-End Customer Purchase Journey | Full Stack | Customer / Admin | **PASS** | Catalog $\rightarrow$ Add to Cart $\rightarrow$ Checkout $\rightarrow$ Payment $\rightarrow$ Confirmation $\rightarrow$ Staff Shipping $\rightarrow$ Customer Tracking. |
| Backend Unit Tests (`npm test`) | Test Harness | Jest | **FAIL** | 2 failed test suites (4 tests) in `cart.controller.spec.ts` and `clubbing.service.spec.ts`. |
| Backend E2E Tests (`npm run test:e2e`) | Test Harness | Jest E2E | **FAIL** | Missing module resolution mapping in `test/jest-e2e.json`. |
| Admin Portal Lint (`npm run lint`) | Tooling | Next Lint | **FAIL** | Exit code 1: Next.js interpreted directory argument as path. |
| Storefront Pointer Event Interception | Browser (Playwright) | Customer | **FAIL** | Decorative image `<img alt="Warm atmosphere">` in `z-10` layer blocks normal pointer clicks on header cart button. |

---

## 4. DETAILED FINDINGS

### [CRIT-01] Unauthenticated PII & Financial Disclosure on Invoice and Shipping Label Endpoints
* **Severity:** Critical
* **Area:** Orders / Information Disclosure
* **Affected File:** [customer-orders.controller.ts:28-38](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/orders/customer-orders.controller.ts#L28-L38)
* **Steps to Reproduce:**
  1. Identify any existing order ID (e.g. `6ab18ff1-01ca-4cb5-83e7-d1edf69f1574`).
  2. Send an unauthenticated GET request: `curl http://localhost:5000/orders/6ab18ff1-01ca-4cb5-83e7-d1edf69f1574/invoice`
  3. Send an unauthenticated GET request: `curl http://localhost:5000/orders/6ab18ff1-01ca-4cb5-83e7-d1edf69f1574/shipping-label`
* **Expected Result:** HTTP 401 Unauthorized or HTTP 404 Not Found unless authenticated as the purchasing customer or authorized staff.
* **Actual Result:** HTTP 200 OK returning full HTML tax invoice and shipping packing slip containing the customer's full name, billing/shipping address, phone number, purchased items, prices, and tax breakdown.
* **Evidence:**
  ```http
  HTTP/1.1 200 OK
  Content-Type: text/html; charset=utf-8
  <!DOCTYPE html><html lang="en"><head><title>Tax Invoice - INV-1188</title>...
  ```
* **Suggested Fix:** Remove `@Public()` from both routes. Apply `OptionalJwtAuthGuard` or require staff role / authenticated order owner matching `order.customerId === req.user.userId`.

---

### [CRIT-02] Hardcoded Cloudflare R2 Secret Access Key in Deployment Script
* **Severity:** Critical
* **Area:** Infrastructure / Secrets Management
* **Affected File:** [deploy.sh:94](file:///c:/Users/andre/Desktop/projects/sridattam/deploy.sh#L94)
* **Steps to Reproduce:**
  1. Inspect `deploy.sh` line 94.
  2. Locate `R2_SECRET_ACCESS_KEY=d99b25a7df049e93750190476de031bb34e727c435bffc22cfa365a4aa66e54a`.
* **Expected Result:** Credentials must be injected via external environment variables or CI/CD secrets; never hardcoded in repository scripts.
* **Actual Result:** Real Cloudflare R2 Secret Access Key is committed in plaintext.
* **Evidence:** Found during static secrets scan:
  ```bash
  deploy.sh:94: R2_SECRET_ACCESS_KEY=d99b25a7df049e93750190476de031bb34e727c435bffc22cfa365a4aa66e54a
  ```
* **Suggested Fix:** Remove the hardcoded secret immediately. Rotate the R2 token in Cloudflare dashboard. Update `deploy.sh` to prompt the operator or read from `.env`.

---

### [CRIT-03] Backend Unit Test Suites Failing on Maintenance Guard and Clubbing Mock
* **Severity:** Critical
* **Area:** Build & Test Health
* **Affected Files:** [cart.controller.spec.ts:15](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/cart/cart.controller.spec.ts#L15), [clubbing.service.spec.ts:100](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/clubbing/clubbing.service.spec.ts#L100)
* **Steps to Reproduce:**
  1. Run `cd backend && npm test`.
* **Expected Result:** All test suites pass (exit code 0).
* **Actual Result:** 2 suites failed (4 tests failed out of 266 total). Exit code 1.
* **Evidence:**
  ```text
  FAIL src/cart/cart.controller.spec.ts
  ● CartController › should be defined
    Nest can't resolve dependencies of the BlockDuringMaintenanceGuard (?). Please make sure that the argument SiteStatusService at index [0] is available in the RootTestModule module.

  FAIL clubbing/clubbing.service.spec.ts
  ● ClubbingService › calculateCartDiscount › calculates fixed price bundle discount correctly
    TypeError: Cannot read properties of undefined (reading 'findMany')
    at ClubbingService.calculateCartDiscount (clubbing/clubbing.service.ts:470:48)
  ```
* **Suggested Fix:**
  1. In `cart.controller.spec.ts`, provide a mock for `SiteStatusService` or override `BlockDuringMaintenanceGuard`.
  2. In `clubbing.service.spec.ts`, mock `this.prisma.product.findMany` in test setup.

---

### [CRIT-04] High and Critical Vulnerabilities in Production Dependencies
* **Severity:** Critical
* **Area:** Dependencies / CVE
* **Affected Files:** [package.json:60](file:///c:/Users/andre/Desktop/projects/sridattam/package.json#L60), [admin-portal/package.json:50](file:///c:/Users/andre/Desktop/projects/sridattam/admin-portal/package.json#L50)
* **Steps to Reproduce:**
  1. Run `npm audit` in the root repository.
  2. Run `npm audit` in `admin-portal`.
* **Expected Result:** 0 critical or high severity vulnerabilities.
* **Actual Result:**
  * Root storefront: 50 vulnerabilities (2 critical, 10 high). Critical: Next.js 14.2.3 cache poisoning and SSRF vulnerabilities; proxy-addr IP spoofing.
  * Admin portal: 5 vulnerabilities (1 critical, 3 high). Critical: Next.js 16.3.4 RCE in `next/og` ImageResponse (GHSA-vcvr-r3jv-pc5j).
* **Suggested Fix:** Upgrade `next` to latest patched releases in root (`>=14.2.35` or Next 15 LTS) and admin portal (`>=16.4.3`).

---

### [HIGH-01] Unhandled HTTP 500 Crash on Negative/Zero Pagination Parameters
* **Severity:** High
* **Area:** API Robustness / Query Validation
* **Affected Files:** `ProductsController`, `OrdersController`, `PaymentsController`
* **Steps to Reproduce:**
  1. Send request: `GET http://localhost:5000/products?page=-1`
  2. Send request: `GET http://localhost:5000/admin/orders?page=0` (with Admin token)
  3. Send request: `GET http://localhost:5000/admin/payments?page=-1` (with Admin token)
* **Expected Result:** HTTP 400 Bad Request indicating `page` must be an integer greater than or equal to 1.
* **Actual Result:** HTTP 500 Internal Server Error (`{"statusCode":500,"message":"Internal server error"}`).
* **Evidence:** Prisma throws an unhandled exception because `skip = (page - 1) * limit` computes a negative number (`-5`), which PostgreSQL / Prisma rejects.
* **Suggested Fix:** Add `@Min(1)` to `page` query DTOs or enforce `Math.max(1, page)` in controller query pipes.

---

### [HIGH-02] Backend E2E Test Suite Fails to Execute
* **Severity:** High
* **Area:** Test Infrastructure
* **Affected File:** [backend/test/jest-e2e.json](file:///c:/Users/andre/Desktop/projects/sridattam/backend/test/jest-e2e.json)
* **Steps to Reproduce:**
  1. Run `cd backend && npm run test:e2e`.
* **Expected Result:** Jest executes e2e tests against the application module.
* **Actual Result:** Test fails before running:
  ```text
  Cannot find module './r2.constants.js' from '../src/r2/r2.module.ts'
  ```
* **Suggested Fix:** Add `"moduleNameMapper": { "^(\\.{1,2}/.*)\\.js$": "$1" }` to `backend/test/jest-e2e.json`, matching `backend/package.json`.

---

### [HIGH-03] Admin Portal Lint Command Fails
* **Severity:** High
* **Area:** Code Quality / CI Tooling
* **Affected File:** [admin-portal/package.json:9](file:///c:/Users/andre/Desktop/projects/sridattam/admin-portal/package.json#L9)
* **Steps to Reproduce:**
  1. Run `cd admin-portal && npm run lint`.
* **Expected Result:** ESLint checks admin portal source files.
* **Actual Result:** Fails with exit code 1: `Invalid project directory provided, no such directory: .../admin-portal/lint`.
* **Suggested Fix:** Change script to `"lint": "next lint ."` or configure ESLint CLI directly.

---

### [HIGH-04] Storefront Decorative Image Intercepts Pointer Events
* **Severity:** High
* **Area:** Storefront UI / Usability
* **Affected File:** `app/page.js`
* **Steps to Reproduce:**
  1. Open `http://localhost:3000` in desktop viewport.
  2. Attempt to click header "Open cart" button.
* **Expected Result:** Button receives click and opens cart drawer.
* **Actual Result:** Section image with `z-10` layer intercepts pointer clicks, causing click timeouts or ignored taps.
* **Suggested Fix:** Add `pointer-events-none` to decorative background image elements in `app/page.js`.

---

### [HIGH-05] Missing Invoices and Labels Route in Admin Navigation
* **Severity:** High
* **Area:** Admin Portal Navigation / RBAC
* **Affected File:** [admin-portal/lib/roles.js:35-85](file:///c:/Users/andre/Desktop/projects/sridattam/admin-portal/lib/roles.js#L35-L85)
* **Steps to Reproduce:**
  1. Inspect `admin-portal/app/(dashboard)/invoices-labels/page.tsx`.
  2. Inspect `ROLE_NAV_ITEMS` and `ROLE_ALLOWED_ROUTE_PREFIXES` in `admin-portal/lib/roles.js`.
* **Expected Result:** Operational staff can access bulk invoice printing via sidebar navigation.
* **Actual Result:** `/invoices-labels` is absent from all role navigation lists and allowed route prefixes. Direct access by non-admin staff triggers an automatic redirect away from the page.
* **Suggested Fix:** Add `/invoices-labels` to `ROLE_NAV_ITEMS` and `ROLE_ALLOWED_ROUTE_PREFIXES` for appropriate roles.

---

### [MED-01] Stored XSS in Customer Address Book
* **Severity:** Medium
* **Area:** Addresses / Security
* **Affected File:** [create-address.dto.ts](file:///c:/Users/andre/Desktop/projects/sridattam/backend/src/addresses/dto/create-address.dto.ts)
* **Steps to Reproduce:**
  1. Authenticate as customer.
  2. Send `POST /addresses/me` with `fullName: "<script>alert('XSS')</script>"`.
* **Expected Result:** Server strips HTML tags or escapes entities.
* **Actual Result:** Server accepts and stores raw HTML tags in database (`Saved fullName: <script>alert('XSS')</script>`).
* **Suggested Fix:** Use `sanitize-html` or custom transform decorator to sanitize address text fields before database insertion.

---

### [MED-02] Architectural Conflict: Customer Accounts Documented vs Pure Guest Checkout
* **Severity:** Medium
* **Area:** Architecture / Documentation
* **Affected Files:** [README.md:201](file:///c:/Users/andre/Desktop/projects/sridattam/README.md#L201), [middleware.js:55-58](file:///c:/Users/andre/Desktop/projects/sridattam/middleware.js#L55-L58)
* **Steps to Reproduce:**
  1. Compare README section 4 (`/account` and `/register`) with `middleware.js` lines 55-58.
* **Expected Result:** Architecture documentation reflects actual production behavior.
* **Actual Result:** README states customers have profile editors, address books, and order history at `/account`. `middleware.js` forcibly redirects `/account` and `/register` to `/`, explicitly commenting that customer accounts do not exist.
* **Suggested Fix:** Update README to state that Storefront v1 operates as pure guest checkout, or enable account routes if customer accounts are planned for launch.

---

### [MED-03] Duplicate `schema.prisma` Files
* **Severity:** Medium
* **Area:** Database / Maintenance
* **Affected Files:** `backend/prisma/schema.prisma` vs `backend/src/prisma/schema.prisma`
* **Finding:** Both files are currently byte-identical (12,570 bytes). However, maintaining two schema copies creates severe divergence risk.
* **Suggested Fix:** Delete `backend/prisma/schema.prisma` and standardize on `backend/src/prisma/schema.prisma` (as configured in `backend/prisma.config.ts`).

---

## 5. BUSINESS LOGIC & CALCULATION RESULTS

### 5.1 Financial Reconciliation Table (Paise Accuracy)

All amounts were verified by creating a real order in the live database and verifying the calculated ledger fields:

| Field | Expected Value (INR) | Calculated Server Value | Paired Paise Value | Reconciled? |
|:---|:---:|:---:|:---:|:---:|
| **Item Subtotal** | ₹109.00 | ₹109.00 | 10900 paise | ✅ PASS |
| **Shipping Charge** | ₹49.00 | ₹49.00 | 4900 paise | ✅ PASS |
| **Discount Total** | ₹0.00 | ₹0.00 | 0 paise | ✅ PASS |
| **Tax Total (GST)** | ₹0.00 | ₹0.00 | 0 paise | ✅ PASS |
| **Grand Total** | **₹158.00** | **₹158.00** | **15800 paise** | ✅ PASS |
| **Client Tampering (-5000)** | Overridden | ₹158.00 | 15800 paise | ✅ PASS |

### 5.2 Order State Machine Transition Matrix

| Current Status | Target Transition | Role Used | Result | Behavior Notes |
|:---|:---|:---:|:---:|:---|
| `payment_pending` | `paid` | Admin | **200 OK** | Legal transition upon verified payment |
| `paid` | `processing` | Admin | **200 OK** | Legal operational transition |
| `processing` | `shipped` (No tracking) | Admin | **400 Bad Request** | Blocked: Tracking URL is mandatory |
| `processing` | `shipped` (With tracking) | Admin | **200 OK** | Legal transition; customer timeline updated |
| `shipped` | `delivered` | Admin | **200 OK** | Legal delivery completion |
| `payment_pending` | `delivered` | Admin | **400 Bad Request** | Blocked: Illegal state jump |
| `processing` | `delivered` | Admin | **400 Bad Request** | Blocked: Cannot skip shipped state |
| `delivered` | `payment_pending` | Admin | **400 Bad Request** | Blocked: Cannot revert delivered order |

---

## 6. SECURITY AND DEPENDENCY AUDIT

### 6.1 Hardcoded Secrets Scan
* **deploy.sh:94**: Hardcoded Cloudflare R2 Secret Key (`d99b25a7...`). **CRITICAL DEFECT**.
* **docker-compose.yml:21**: Plaintext default password `sridattam_secure_pass_2026`.
* **backend/.env**: Contains local test JWT secrets and Razorpay test credentials. (Acceptable for dev, must be rotated for staging/production).

### 6.2 Security Headers Audit (`GET /health`)
* `Content-Security-Policy`: ✅ Present (`default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; ...`)
* `X-Content-Type-Options`: ✅ `nosniff`
* `X-Frame-Options`: ✅ `SAMEORIGIN`
* `Strict-Transport-Security`: ✅ `max-age=31536000; includeSubDomains`

### 6.3 CORS Verification
* Request with Origin `https://evil-attacker-site.com` $\rightarrow$ `Access-Control-Allow-Origin: null`. External unauthorized origins are strictly blocked.
* Request with Origin `http://localhost:3000` $\rightarrow$ Allowed.
* Request with Origin `http://localhost:3001` $\rightarrow$ Allowed.

### 6.4 PCI-DSS Sensitive Cardholder Data Scan
* Scanned all `Payment` database records and JSON API responses: Zero instances of credit card numbers, PANs, CVVs, or bank cardholder data exist in the database or server logs. All payment card transactions take place entirely within Razorpay's client-side modal.

---

## 7. DOCUMENTED-BUT-MISSING FEATURES & CONFLICTS

1. **Storefront Customer Accounts**:
   * *Documented*: `README.md` lines 201-202 describe full customer account self-service: address book, profile editor, and order history at `/account` and registration at `/register`.
   * *Actual Code*: `middleware.js` lines 55-58 forces a 307 redirect from `/account` and `/register` to `/`, explicitly noting that storefront customer accounts do not exist.
2. **Bulk Invoices & Shipping Labels in Admin Sidebar**:
   * *Documented / Present in Code*: `admin-portal/app/(dashboard)/invoices-labels/page.tsx`.
   * *Actual Navigation*: Missing from `ROLE_NAV_ITEMS` in `admin-portal/lib/roles.js`.
3. **Prisma Schema Duplication**:
   * `backend/prisma/schema.prisma` vs `backend/src/prisma/schema.prisma`. Both exist and must be consolidated.
4. **Outdated Architecture Guide (`codebase_analysis.md`)**:
   * `codebase_analysis.md` describes an obsolete WooCommerce proxy architecture (`app/api/[[...path]]/route.js`). The repo has fully migrated to NestJS + Prisma.

---

## 8. LIMITATIONS

1. **Cloudflare R2 Bucket Uploads**: Tested via S3 client mock and controller validation. Live file uploads against the production Cloudflare R2 bucket were not executed to avoid polluting live cloud storage.
2. **Live Razorpay Captures**: All financial transactions were executed in Razorpay Test Mode (`rzp_test_...`) using valid HMAC SHA-256 signatures; live banking / credit card rails were not charged.
3. **SMTP Live Mail Transport**: Notification queue was tested via BullMQ and Nodemailer with fallback logging; real external SMTP delivery depends on third-party mail server credentials.

---

## 9. HOW TO RE-RUN ALL TESTS WITH ONE COMMAND

A unified master test runner has been created at `qa-tests/run_all_tests.mjs`.

### Run All Test Suites
From the repository root, run:
```bash
node qa-tests/run_all_tests.mjs
```

### Run Individual Test Suites
* **Auth Matrix & RBAC (931 requests)**: `node qa-tests/test_auth_matrix.mjs`
* **IDOR & Ownership**: `node qa-tests/test_idor_and_ownership.mjs`
* **Validation & Injection**: `node qa-tests/test_validation_and_injection.mjs`
* **Pagination & Sorting Boundaries**: `node qa-tests/test_pagination_filters_sorting.mjs`
* **Business Logic & State Machine**: `node qa-tests/test_business_logic.mjs`
* **Webhooks & Cryptographic HMAC**: `node qa-tests/test_webhooks_signatures.mjs`
* **Infrastructure & Maintenance Mode**: `node qa-tests/test_infra_security_maintenance.mjs`
* **Playwright Route Protection**: `node qa-tests/playwright_route_protection.mjs`
* **Full End-to-End Customer & Staff Journey**: `node qa-tests/playwright_e2e_journey.mjs`

---

## 10. RECOMMENDED FIX ORDER

1. **Step 1 — Immediate Security Fixes (Deploy Blockers)**:
   * Remove `@Public()` from `GET /orders/:id/invoice` and `GET /orders/:id/shipping-label` in `CustomerOrdersController`. Enforce authentication and customer ownership matching.
   * Remove the hardcoded R2 secret key from `deploy.sh` and rotate the credential in Cloudflare.
2. **Step 2 — Test Suite & CI Stabilization**:
   * Update `backend/src/cart/cart.controller.spec.ts` to provide `SiteStatusService` in the test module.
   * Update `backend/src/clubbing/clubbing.service.spec.ts` to mock `prisma.product.findMany`.
   * Add `"moduleNameMapper": { "^(\\.{1,2}/.*)\\.js$": "$1" }` to `backend/test/jest-e2e.json`.
   * Fix `admin-portal/package.json` lint script.
3. **Step 3 — API Crash & Validation Hardening**:
   * Enforce `@Min(1)` pagination checks on all controller query parameters to eliminate unhandled HTTP 500 errors on `page=0` or `page=-1`.
   * Add input sanitization (`sanitize-html`) and `@MaxLength(100)` to customer address creation to prevent stored XSS and oversized payloads.
4. **Step 4 — UI & Operational Fixes**:
   * Add `pointer-events-none` to the decorative background image section in `app/page.js` to ensure header buttons are never intercepted.
   * Add `/invoices-labels` to `ROLE_NAV_ITEMS` and `ROLE_ALLOWED_ROUTE_PREFIXES` in `admin-portal/lib/roles.js`.
5. **Step 5 — Dependency & Documentation Alignment**:
   * Run `npm audit fix` and upgrade Next.js to address high/critical CVEs.
   * Align `README.md` with `middleware.js` regarding customer accounts vs pure guest checkout.
   * Remove redundant `backend/prisma/schema.prisma` file.
