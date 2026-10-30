# FINAL REVIEW & AUDIT REPORT

## 1. Launch Decision: NO-GO
**Top Risks:**
1. **Deployment Blocker**: Fresh DB `prisma migrate deploy` crashes (`relation "clubbing_rules" does not exist`) because baseline migrations are missing, and `prisma.config.ts` points to `src/prisma/schema.prisma` while migrations reside in `prisma/migrations`.
2. **Security & Data Leaks**: `GET /admin/payments` returns `razorpaySignature` in API responses; `GET /admin/all-categories` is public (`@Public()`); staff emails are exposed in order status histories.
3. **Draft Catalog Leak**: Passing `?admin=true` to `GET /products` allows unauthenticated visitors to view draft/archived items.
4. **Redis Hang on Outage**: Redis client lacks `enableOfflineQueue: false`; cache does not fail-open during Redis downtime and instead hangs client requests.

---

## 2. Task-List Truth Table (Phases 1–5)
| Phase | Feature / Component | Status | Notes |
|---|---|---|---|
| Phase 1 | Native Checkout & Razorpay Sessions | **Verified** | Server-side totals, integer paise, guest checkout, cart converted idempotently. |
| Phase 2 | Security, RBAC & Protection | **Partly** | JWT & roles work, but `/admin/all-categories` is public and `?admin=true` leaks drafts. |
| Phase 3 | Order Control & Webhooks | **Partly** | Webhook HMAC & replay pass; staff email leaks in history; partial refund marks order fully refunded. |
| Phase 4 | Category Hierarchy & Validation | **Partly** | Cycle prevention & delete guards work; admin listing route unauthenticated. |
| Phase 5 | Redis Cache & Infrastructure | **Partly** | Cache-aside & invalidation work; fails to open during outage due to offline queuing. |

---

## 3. Real Problems Identified
1. **BLOCKER** (`backend/prisma/migrations` & `backend/prisma.config.ts:5`): Missing initial DB migration causes `migrate deploy` to fail on empty DBs; config points to `src/prisma/schema.prisma` while migrations are in `prisma/migrations`.  
   *Fix:* Baseline the initial schema into a migration or sync config schema path.
2. **HIGH** (`backend/src/payments/payments.service.ts:670-705`): `getAllPayments` returns raw record including `razorpaySignature`.  
   *Fix:* Omit `razorpaySignature` in Prisma select/map.
3. **HIGH** (`backend/src/categories/categories.controller.ts:27-28`): `@Public()` decorator applied to `@Get(['admin/all-categories', 'categories'])`.  
   *Fix:* Separate public `categories` from protected `@Roles(ROLES.READ_ONLY)` `admin/all-categories`.
4. **HIGH** (`backend/src/products/products.controller.ts:197, 213`): `isAdmin` flag trusts `?admin=true` without auth verification.  
   *Fix:* Guard `hasAdminQuery` behind `Boolean(isStaff && hasAdminQuery)`.
5. **HIGH** (`backend/src/redis/redis.module.ts:32-47`): `ioredis` defaults `enableOfflineQueue: true`, causing HTTP requests to hang during Redis downtime.  
   *Fix:* Set `enableOfflineQueue: false` in Redis client options.
6. **MEDIUM** (`backend/src/orders/orders.service.ts:225, 375`): `changedByUser` in `statusHistory` includes `email: true`.  
   *Fix:* Remove `email: true` from Prisma select.
7. **MEDIUM** (`backend/src/products/products.service.ts:507`): `updateProduct` does not catch `P2002` duplicate slug errors, throwing unhandled 500 instead of 409.  
   *Fix:* Catch `P2002` and rethrow `ConflictException('Slug or SKU already exists')`.
8. **MEDIUM** (`backend/src/cart/cart.service.ts:263` & `pricing.service.ts:243`): `PricingService` omits `variant` in `ComputedPricingItem`, causing variable item `regularPrice` to fall back to `unitPrice`.  
   *Fix:* Populate `regularPriceSnapshot` in `ComputedPricingItem`.
9. **LOW** (`backend/src/orders/orders.service.ts:241` & `admin-portal/lib/api/orders.js:326`): Order listing API lacks date filtering parameters.  
   *Fix:* Add `dateFrom` and `dateTo` query parameters to backend and frontend.
10. **LOW** (`backend/src/payments/payments.service.ts:486-512`): Partial refund webhooks unconditionally transition order to `OrderStatus.refunded`.  
    *Fix:* Compare refund amount with paid amount before marking order `refunded`.

---

## 4. Could Not Verify & Why
- Interactive UI click flows (e.g. native Razorpay modal iframe interactions) could not be executed visually because browser automation drivers (Puppeteer/Playwright) are not installed in the container; all APIs and webhook lifecycles were verified programmatically.

---

## 5. Owner Production Actions (Outside Code)
1. Add live production Razorpay Key ID and Secret in backend `.env` (currently using test keys).
2. Configure Razorpay Dashboard webhook endpoint (`/payments/webhook`) with `payment.captured`, `payment.failed`, and `refund.processed` events and set `RAZORPAY_WEBHOOK_SECRET`.
3. Set distinct, high-entropy 64-character strings for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
4. Ensure VPS production Postgres DB is baselined with schema before running backend.
