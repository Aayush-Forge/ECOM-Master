# ADMIN AND PAYMENTS AUDIT & FIX REPORT

## AREA 1: Products
- FIXED: Added `metaTitle`, `metaDescription`, and `metaKeywords` to Prisma Product model & migration `20261003_add_product_seo_fields`.
- FIXED: Added SEO metadata Card and custom JSONB fields editor in admin product form view.
- FIXED: Added URL slug editing in admin product form view; added storefront head metadata integration for slug pages.
- FIXED: Filter/search/pagination wired in admin products list with total counts and page navigation.
- FIXED: Read-only staff gated from product creation, editing, and deletion in admin UI (`hasRole(user, ROLES.EDITOR)`).
- ALREADY OK: Backend DTO whitelist validation, rich text sanitization with sanitize-html, category hierarchy handling.

## AREA 2: Orders & Payments View
- FIXED: Admin order details view now displays full `order_status_history` audit timeline with authors, timestamps, and notes.
- FIXED: Backend `OrdersService.getOrderById` and `updateStatus` now include `changedByUser` user relations in status history.
- FIXED: `normalizeOrder` in admin-portal maps line item snapshots (`titleSnapshot`, `skuSnapshot`, `unitPriceSnapshot`) and `statusHistory`.
- FIXED: Admin payments list view default base route updated to `/orders` for direct order inspection.
- ALREADY OK: Legal transitions restricted per status; read_only staff role permitted to transition status; payments page connected to real `/admin/payments` backend endpoint.

## AREA 3: Payment Security
- FIXED: `verifyPayment` strictly checks order is in `payment_pending` status before capturing payment; emits `order.status_changed`.
- FIXED: Webhook `payment.captured` verifies incoming amount in paise and currency against `order.grandTotal` and `order.currency`.
- FIXED: Webhook transitions emit `order.status_changed` alongside domain events for complete audit tracking.
- ALREADY OK: Exact integer paise conversion (`Math.round(grandTotal * 100)`); `timingSafeEqual` signature validation; raw body webhook HMAC-SHA256 verification using `RAZORPAY_WEBHOOK_SECRET`; idempotency via `payment_webhook_events`; `payment.failed` idempotently cancels order and releases coupon count; mock gateway disabled when `NODE_ENV === 'production'`; no secrets, card details, or sensitive keys logged.

## DECISIONS NEEDED
- DECISIONS NEEDED: Direct courier API integration (e.g., Delhivery AWB generation) currently out of scope; tracking details are recorded via manual staff input or order notes.
