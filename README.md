# Sridattam E-Commerce Platform

Sridattam monorepo encompassing the customer storefront, staff administration portal, and central backend API.

- `backend/`: NestJS + Prisma REST API service.
- `admin-portal/`: Next.js staff management interface.
- Storefront (`app/`, `components/`, `lib/` in root): Next.js customer shopping application.

## Local Setup
1. Start infrastructure: `docker compose up -d postgres redis` (PostgreSQL on port `5432`, Redis on port `6379`).
2. Configure environment: Copy `backend/.env.example` to `backend/.env`.
3. Database migrations & seed: In `backend/`, run `npx prisma migrate reset` (note: migrations are ONE baseline, reset after pulling) followed by `npm run seed`.
4. Run development applications:
   - Backend: `npm --prefix backend run start:dev` (port `5000`).
   - Storefront: `npm run dev` (port `3000`).
   - Admin Portal: `npm --prefix admin-portal run dev` (port `3001`).

## Environment Variables (`backend/.env.example`)

- `NODE_ENV`: Runtime execution environment mode.
- `PORT`: HTTP listening port for backend server.
- `FRONTEND_URL` / `ADMIN_URL`: CORS allowed origin URLs for storefront and admin portal.
- `DATABASE_URL`: PostgreSQL connection string with schema path.
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`: PostgreSQL container credentials.
- `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`: Redis connection host, port, and password.
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: Secrets for signing access and refresh tokens.
- `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_BASE_URL`: Cloudflare R2 object storage credentials and public CDN base URL.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`: Razorpay gateway API keys and webhook signing secret.
- `EMAIL_PROVIDER`: Email transport mode (`console` or `smtp`).
- `EMAIL_FROM` / `EMAIL_BRAND_NAME` / `EMAIL_LOGO_URL`: Default sender address, brand header, and logo URL.
- `INTERNAL_ALERT_EMAILS`: Comma-separated staff addresses receiving operational alerts.
- `EMAIL_DEBUG`: Toggle detailed email body output in console provider.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS`: SMTP server connection and auth settings.
- `SUPPORT_EMAIL` / `SUPPORT_PHONE`: Support contact details shown across transactional templates.

## Roles & Access Control

Hierarchy: `admin` > `editor` > `read_only` > `customer`.
- `admin`: Full access across catalog, operations, audit logs, and staff account management.
- `editor`: Catalog CRUD (products, categories, discounts) and operations (orders, payments).
- `read_only`: Operational view only (inspect orders and payment transaction records).
- `customer`: Public customer storefront account (profile, addresses, personal order history).
All role/route logic lives in admin-portal/lib/roles.js.

## Backend Modules (`backend/src`)

- `addresses`: Customer shipping and billing address CRUD.
- `analytics`: Sales totals, top products/categories, and operational metrics.
- `audit`: Staff mutation audit logging interceptor and querying.
- `auth`: JWT authentication, credential hashing, and role rank guards.
- `cart`: Session-backed server carts and item mutations.
- `categories`: Hierarchical category tree management with cycle detection.
- `clubbing`: Bundle deals and coupon discount calculation engine.
- `customers`: Aggregated customer view derived from order records.
- `notifications`: Transactional email dispatcher, worker, and templates.
- `orders`: Order state machine, sequence number generator, and tracking.
- `payments`: Razorpay session creation, HMAC signature verification, and webhook handling.
- `pricing`: Server-side pricing calculation and inventory validation.
- `prisma`: Database connection provider and schema models.
- `products`: Product catalog, variations, Cloudflare R2 uploads, and CSV import/export.
- `r2`: Cloudflare R2 object storage integration service.
- `redis`: Redis cache-aside layer with fail-open fallback.
- `users`: Staff account administration and user profiles.

## Rules for Contributors

1. One migration per change (pull first).
2. No hardcoded role checks.
3. Specs must not be weakened.
4. Order_items snapshots never read live products.

## Known Gaps / Not Built

- Tax calculation is hardcoded to 0.
- Invoice PDF generation is not built (TBD).
- Delhivery shipping integration is not built (TBD).
- Product customer reviews are not built (TBD).
- Cart abandonment automation is not built (CartStatus.abandoned enum reserved).
- EmailTemplate database table is reserved (templates live in code).
- Note: Database seed refuses to run in production (`NODE_ENV === 'production'`).
