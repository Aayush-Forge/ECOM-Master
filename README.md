# Sridattam E-Commerce Platform — System Architecture & Handbook

Sridattam is an enterprise-grade e-commerce monorepo encompassing the customer storefront, staff administration portal, and central NestJS REST API.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [End-to-End System Diagrams](#-end-to-end-system-diagrams)
3. [Deep Dive: Backend Modules (`backend/src`)](#-deep-dive-backend-modules-backendsrc)
4. [Deep Dive: Customer Storefront (`app/`, `components/`)](#-deep-dive-customer-storefront-app-components)
5. [Deep Dive: Staff Admin Portal (`admin-portal/`)](#-deep-dive-staff-admin-portal-admin-portal)
6. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
7. [System & Hardware Requirements](#-system--hardware-requirements)
8. [Setup & Deployment Guide](#-setup--deployment-guide)
   - [Option A: 1-Click VPS Deployment (`deploy.sh`)](#option-a-1-click-automated-vps-deployment-hostinger--linux)
   - [Option B: 1-Click Windows Local Setup (`start.bat`)](#option-b-1-click-local-setup-on-windows)
   - [Option C: Manual Docker Compose](#option-c-manual-docker-compose)
9. [Database Migrations & Seeding](#-database-migrations--seeding)
10. [Environment Variables Reference](#-environment-variables-reference-env)
11. [Production Domain & Nginx Reverse Proxy Setup](#-production-domain--nginx-reverse-proxy-setup)
12. [Comprehensive Troubleshooting Guide](#-comprehensive-troubleshooting-guide)

---

## 🏛️ Architecture Overview

The platform uses a micro-service-inspired monorepo architecture with containerized services:

```mermaid
flowchart TD
    subgraph Clients["Clients / Browsers"]
        CustomerBrowser["Customer Browser"]
        StaffBrowser["Staff Admin Browser"]
    end

    subgraph Proxy["Reverse Proxy / Edge (Optional Production)"]
        CF["Cloudflare CDN & DNS"]
        Nginx["Nginx Reverse Proxy (Port 80/443)"]
    end

    subgraph DockerNetwork["Docker Bridge Network: sridattam_network"]
        Storefront["Storefront (Next.js 14)\nPort: 3000"]
        AdminPortal["Admin Portal (Next.js 14)\nPort: 3001"]
        BackendAPI["Backend API (NestJS 11)\nPort: 5000"]
        Postgres[("PostgreSQL 15\nPort: 5432")]
        Redis[("Redis 7\nPort: 6379")]
    end

    subgraph External["External Cloud Services"]
        R2["Cloudflare R2 (Media Storage)"]
        Razorpay["Razorpay Gateway (Payments)"]
        SMTP["SMTP Mail Server"]
    end

    CustomerBrowser -->|HTTPS| CF
    StaffBrowser -->|HTTPS| CF
    CF --> Nginx
    Nginx -->|Proxy :3000| Storefront
    Nginx -->|Proxy :3001| AdminPortal
    Nginx -->|Proxy :5000| BackendAPI

    Storefront -->|Internal SSR :5000| BackendAPI
    Storefront -->|Client Browser API calls| BackendAPI
    AdminPortal -->|Client Browser API calls| BackendAPI

    BackendAPI -->|Prisma ORM| Postgres
    BackendAPI -->|BullMQ & Cache| Redis
    BackendAPI -->|Upload Media| R2
    BackendAPI -->|Order & Verification| Razorpay
    BackendAPI -->|Dispatch Emails| SMTP
```

### Container Specifications & Port Mapping

| Service | Technology | Internal Port | Host Port | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| **`storefront`** | Next.js 14 (App Router) | `3000` | `3000` | Public e-commerce website (catalog, cart, checkout) |
| **`admin-portal`** | Next.js 14 (Radix UI) | `3001` | `3001` | Operational dashboard for staff, catalog & orders |
| **`backend`** | NestJS 11 + Prisma ORM 7 | `5000` | `5000` | REST API, authentication, RBAC, business logic |
| **`postgres`** | PostgreSQL 15 Alpine | `5432` | `5432` | Primary ACID relational database |
| **`redis`** | Redis 7 Alpine | `6379` | `6379` | Cache-aside layer, session store & BullMQ queue |

---

## 🔄 End-to-End System Diagrams

### 1. Order & Payment Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Browser)
    participant Storefront as Storefront (Next.js)
    participant Backend as Backend API (NestJS)
    participant Redis as Redis (Cart Cache)
    participant Postgres as PostgreSQL DB
    participant Razorpay as Razorpay API

    Customer->>Storefront: 1. Add Items to Cart
    Storefront->>Backend: POST /cart/items
    Backend->>Redis: Cache Cart State
    Backend-->>Storefront: Return Cart Total & Discounts

    Customer->>Storefront: 2. Proceed to Checkout
    Storefront->>Backend: POST /orders/checkout (Shipping Address)
    Backend->>Postgres: Create Order (Status: payment_pending)
    Backend->>Razorpay: Create Razorpay Order
    Razorpay-->>Backend: Return razorpay_order_id
    Backend-->>Storefront: Return Order & Payment Details

    Customer->>Razorpay: 3. Complete Payment in Razorpay Modal
    Razorpay-->>Customer: Payment Success (signature, payment_id)

    Customer->>Storefront: 4. Submit Payment Verification
    Storefront->>Backend: POST /payments/verify
    Backend->>Backend: Validate HMAC SHA-256 Signature
    Backend->>Postgres: Update Order Status -> 'paid'
    Backend->>Redis: Enqueue 'order.confirmation' Email Task
    Backend-->>Storefront: 200 OK (Confirmed)
    Storefront-->>Customer: Display Order Confirmation Page
```

---

## 🧩 Deep Dive: Backend Modules (`backend/src`)

The central backend API is written in **NestJS** with strict modular separation of concerns:

```
backend/src/
├── addresses/       # Customer delivery and billing address CRUD
├── analytics/       # Aggregated sales metrics, revenue reports, AOV
├── audit/           # Interceptor-based staff mutation audit logging
├── auth/            # JWT auth, refresh tokens, passport guards, RBAC
├── cart/            # Server-backed cart session engine
├── categories/      # Hierarchical category tree with cycle detection
├── clubbing/        # Multi-product discount engine & volume pricing
├── company-profile/ # Business legal info, GSTIN, invoice prefix & docs
├── customers/       # Aggregated customer analytics and history
├── notifications/   # BullMQ email queue, templates, SMTP / console worker
├── orders/          # Sequential order number generator & state machine
├── payments/        # Razorpay integration, HMAC verification & webhooks
├── pricing/         # Server-side pricing recalculation & inventory validation
├── prisma/          # PrismaClient provider & schema.prisma definitions
├── products/        # Product catalog, variations, R2 image uploads & CSV import
├── r2/              # Cloudflare R2 object storage (AWS S3 SDK client)
├── redis/           # Redis connection manager and cache helper
├── reviews/         # Product reviews, 5-star rating aggregations
├── shipping/        # Shipping zone rules, carrier calculation, tracking
└── users/           # Staff accounts, customer authentication records
```

### Module Breakdown

#### 1. `auth/` & `users/`
* **JWT Authentication**: Signs stateless access tokens (15m expiry) and refresh tokens (7d expiry).
* **Password Security**: Bcrypt with 10 salt rounds.
* **Role Rank Guards**: Protects sensitive administrative routes using `@Roles(UserRole.admin, UserRole.editor)`.

#### 2. `products/` & `r2/`
* **Catalog Management**: Supports simple products and variable products with attributes (weight, fragrance, pack size).
* **Cloudflare R2 Integration**: S3-compatible object storage for uploading high-resolution product photos. All URLs are served through public CDN (`R2_PUBLIC_BASE_URL`).
* **CSV Bulk Import/Export**: Parses WooCommerce-compatible CSV exports for catalog synchronization.

#### 3. `categories/`
* Hierarchical parent-child category tree.
* Includes recursive cycle detection to prevent infinite loops (e.g., Category A cannot be its own child).

#### 4. `cart/` & `pricing/` & `clubbing/`
* **Cart Isolation**: Carts are session-backed or customer-backed.
* **Server-Authoritative Pricing**: The client never calculates prices. All subtotals, item discounts, bundle clubbing rules, and final amounts are calculated server-side.

#### 5. `orders/` & `shipping/`
* **Atomic Sequential Numbers**: Generates format `ORD-YYYYMMDD-XXXX`.
* **State Machine**: Strict transition validation: `payment_pending` $\rightarrow$ `paid` $\rightarrow$ `processing` $\rightarrow$ `shipped` $\rightarrow$ `delivered`.
* **Tracking Snapshots**: Historical item snapshots (title, SKU, price at purchase) are immutable and never affected by future product updates.

#### 6. `payments/`
* **Razorpay Gateway**: Creates Razorpay order sessions, verifies cryptographic HMAC SHA-256 signatures upon checkout completion, and captures webhook callbacks.

#### 7. `notifications/`
* **Asynchronous BullMQ Queue**: Emails are offloaded to Redis so checkout and API requests never hang waiting for external mail servers.
* **Resilient Transports**: Sends via SMTP (Nodemailer). Automatically falls back to console logging if SMTP credentials are not configured or offline.

#### 8. `audit/`
* Global interceptor logging every mutation (`POST`, `PUT`, `PATCH`, `DELETE`) by staff members, recording actor ID, IP address, user-agent, target entity, and timestamp.

---

## 🛍️ Deep Dive: Customer Storefront (`app/`, `components/`)

Built on **Next.js 14 App Router** with SSR (Server-Side Rendering) for optimal SEO and client-side hydration for fast interaction:

* **`/` (Homepage)**: Dynamic hero banner, bestseller showcase, featured collections, and verified customer testimonials.
* **`/products`**: Full catalog with multi-facet filtering (categories, price range, fragrances), search bar, and grid/list views.
* **`/products/[slug]`**: Dynamic product detail page with image gallery zoom, variant selectors, inventory counters, and customer review submission.
* **`/categories/[slug]`**: Filtered category landing pages with structured SEO meta tags and breadcrumbs.
* **`/cart`**: Slide-over drawer and dedicated cart page with real-time promo code entry.
* **`/checkout`**: High-conversion one-page checkout integrating Razorpay Checkout Modal.
* **`/orders/[id]`**: Customer order tracking timeline and invoice review.
* **`/account`**: Customer address book, profile editor, and past order history.

---

## 🛡️ Deep Dive: Staff Admin Portal (`admin-portal/`)

Staff administrative application running independently on port `3001`:

* **Dashboard (`/overview`)**: High-level KPIs: Total Revenue, Today's Orders, Average Order Value, and interactive Recharts sales trends.
* **Orders (`/orders`, `/orders/[id]`)**: Full operational order grid with status filter pills, address viewer, status updater, and tracking number assignment.
* **Payments (`/payments`)**: Financial transactions, Razorpay payment ID auditing, and manual payment verification.
* **Shipping (`/shipping`)**: Carrier template editor, shipping zone definitions, and tracking milestones.
* **Products (`/products`, `/products/new`, `/products/[id]/edit`)**: Product manager with rich Tiptap description editor, Cloudflare R2 image uploader, and SKU inventory management.
* **Categories (`/categories`)**: Visual tree editor for managing category taxonomy and SEO tags.
* **Discounts (`/discounts`)**: Fixed/percentage coupon creator and bundle deal manager.
* **Reviews (`/reviews`)**: Moderation queue to approve, reject, or feature customer product reviews.
* **Customers (`/customers`)**: CRM view of registered shoppers and lifetime order history.
* **Audit Logs (`/audit-logs`)**: Security log capturing every administrative mutation with staff attribution.
* **Company Profile (`/company-profile`)**: Business profile editor for legal entity details, GSTIN, PAN, bank accounts, and invoice headers.
* **Staff Users (`/users`)**: Staff RBAC permissions management.

---

## 🔒 Role-Based Access Control (RBAC)

The platform enforces a four-tier hierarchical permission model:

| Role | Catalog CRUD | Order Processing | Staff & System Config | Customer Storefront |
| :--- | :---: | :---: | :---: | :---: |
| **`admin`** | ✅ | ✅ | ✅ *(Full Access)* | ✅ |
| **`editor`** | ✅ | ✅ | ❌ | ❌ |
| **`read_only`** | ❌ *(View Only)* | ❌ *(View Only)* | ❌ | ❌ |
| **`customer`** | ❌ | ❌ | ❌ | ✅ *(Personal Account)* |

*Implementation: Route guards in `admin-portal/lib/roles.js` and NestJS decorators in `backend/src/auth/`.*

---

## 📋 System & Hardware Requirements

See [`requirements.txt`](./requirements.txt) for exact package and version pins.

### Hardware & VPS Sizing
* **Minimum (Testing / Low Traffic)**:
  * vCPU: 1 Core
  * RAM: 4 GB (+ 4 GB Swap enabled)
  * Storage: 50 GB NVMe SSD
* **Recommended (Production — e.g. Hostinger KVM 2 / KVM 4)**:
  * vCPU: 2 to 4 Cores
  * RAM: 8 GB
  * Storage: 100 GB NVMe SSD
  * Bandwidth: 1 Gbps port

### Software Prerequisites
* Docker Engine $\ge$ `24.0.0`
* Docker Compose (v2 Plugin) $\ge$ `2.20.0`
* Node.js $\ge$ `20.0.0` & npm $\ge$ `10.0.0`
* Python $\ge$ `3.10` (for testing suite)

---

## 🚀 Setup & Deployment Guide

### Option A: 1-Click Automated VPS Deployment (Hostinger / Linux)

On a fresh **Ubuntu 22.04 / 24.04** server:

```bash
# 1. Clone repository & switch to target branch
git clone https://github.com/Aayush-Forge/ECOM-Master.git
cd ECOM-Master
git checkout testing_draft

# 2. Run the automated deployment script
sudo bash deploy.sh
```

**What `deploy.sh` handles automatically:**
1. Creates a 4 GB swap file (prevents out-of-memory errors during Next.js compilation).
2. Installs Docker Engine & Docker Compose plugin if missing.
3. Detects public VPS IP and automatically configures `.env` and `backend/.env`.
4. Builds all images and starts containers in detached mode.
5. Waits for PostgreSQL and Redis health checks.
6. Synchronizes Prisma schema (`npx prisma db push`).
7. Populates demo catalog and staff roles (`npx prisma db seed`).
8. Displays ready-to-click URLs and credentials.

---

### Option B: 1-Click Local Setup on Windows

1. Ensure **Docker Desktop** is running.
2. In PowerShell or CMD:
   ```powershell
   cd ECOM-Master
   .\start.bat
   ```
*(Or double-click `start.bat` in Windows Explorer).*

---

### Option C: Manual Docker Compose

```bash
# Start infrastructure and build apps
docker compose up -d --build

# Push database schema
docker compose exec backend npx prisma db push --schema=./src/prisma/schema.prisma

# Seed initial data
docker compose exec backend npx prisma db seed
```

---

## 🗄️ Database Migrations & Seeding

* **Synchronize Schema**:
  ```bash
  docker compose exec backend npx prisma db push --schema=./src/prisma/schema.prisma
  ```
* **Seed Real Catalog & Staff**:
  ```bash
  docker compose exec backend npx prisma db seed
  ```
* **Prisma Studio (Web Database GUI)**:
  ```bash
  docker compose exec backend npx prisma studio --schema=./src/prisma/schema.prisma
  ```

### Default Seeded Accounts
* **Admin**: `admin@sridattam.com` / `password123`
* **Editor**: `editor@sridattam.com` / `password123`
* **Read-Only**: `read_only@sridattam.com` / `password123`
* **Customer**: `customer@sridattam.com` / `password123`

---

## ⚙️ Environment Variables Reference (`.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://sridattam_admin:...@postgres:5432/sridattam_dev_db?schema=public` |
| `BACKEND_PUBLIC_URL` | Browser-reachable REST API URL | `http://localhost:5000` (or `http://<VPS_IP>:5000`) |
| `INTERNAL_BACKEND_URL` | Server-to-server container URL | `http://backend:5000` |
| `FRONTEND_URL` | Customer storefront origin for CORS | `http://localhost:3000` (or `https://yourdomain.com`) |
| `ADMIN_URL` | Admin portal origin for CORS | `http://localhost:3001` (or `https://admin.yourdomain.com`) |
| `JWT_SECRET` | Secret key for signing access tokens | String |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | String |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | Hexadecimal string |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API Access Key | Alphanumeric string |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Key | Alphanumeric string |
| `R2_BUCKET_NAME` | Cloudflare R2 Bucket Name | `sridattam-product-media` |
| `R2_PUBLIC_BASE_URL` | Public CDN base URL for images | `https://pub-xxxx.r2.dev` |
| `RAZORPAY_KEY_ID` | Razorpay Gateway API Key | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Gateway Secret | Alphanumeric string |
| `EMAIL_PROVIDER` | Notification dispatcher mode | `smtp` or `console` |
| `SMTP_HOST` / `SMTP_PORT` | SMTP Mail server settings | `localhost` / `1025` |

---

## 🌐 Production Domain & Nginx Reverse Proxy Setup

To route standard HTTPS traffic (`80` / `443`) to your Docker containers:

1. **DNS A Records**:
   * `yourdomain.com` $\rightarrow$ `YOUR_VPS_IP`
   * `www.yourdomain.com` $\rightarrow$ `YOUR_VPS_IP`
   * `admin.yourdomain.com` $\rightarrow$ `YOUR_VPS_IP`
   * `api.yourdomain.com` $\rightarrow$ `YOUR_VPS_IP`

2. **Nginx Reverse Proxy Configuration** (`/etc/nginx/sites-available/sridattam`):
   ```nginx
   # Storefront
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }

   # Admin Portal
   server {
       listen 80;
       server_name admin.yourdomain.com;
       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }

   # Backend API
   server {
       listen 80;
       server_name api.yourdomain.com;
       client_max_body_size 50M;
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Enable Free SSL**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com
   ```

---

## 🔧 Comprehensive Troubleshooting Guide

### 1. Docker Desktop: "WSL Not Installed" (Windows)
* **Symptom**: Error popup when launching Docker Desktop on Windows.
* **Fix**: Open PowerShell as Administrator and run:
  ```powershell
  wsl --install --no-distribution
  ```
  Restart your PC, then launch Docker Desktop.

### 2. Delay / Lag When Switching Pages on Localhost
* **Symptom**: 10–15 second freeze on clicking navigation links.
* **Cause 1**: Next.js in development mode compiles modules on-demand upon first visit.
* **Cause 2**: Internal server components trying to fetch `http://localhost:5000` inside Docker instead of `http://backend:5000`.
* **Fix**: Ensure `INTERNAL_BACKEND_URL: http://backend:5000` is set in `docker-compose.yml` for the storefront container.

### 3. Port Conflicts (`5432`, `6379`, `3000`, `3001`, `5000`)
* **Symptom**: `Bind for 0.0.0.0:5432 failed: port is already allocated`.
* **Cause**: A local instance of PostgreSQL, Redis, or Node is already running on your host machine.
* **Fix (Windows)**:
  ```powershell
  netstat -ano | findstr :5432
  Stop-Process -Id <PID> -Force
  ```
* **Fix (Linux)**:
  ```bash
  sudo lsof -i :5432
  sudo systemctl stop postgresql
  ```

### 4. Backend Crashing with "Missing R2 Environment Variables"
* **Symptom**: NestJS logs show `Error: R2Module: Missing required environment variables`.
* **Fix**: Verify `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` exist in `.env` and `backend/.env`.

### 5. Database Schema Out of Sync (`ColumnNotFound`)
* **Symptom**: `Invalid prisma.category.upsert(): The column categories.description does not exist`.
* **Fix**: Run Prisma schema push to update PostgreSQL tables without wiping data:
  ```bash
  docker compose exec backend npx prisma db push --schema=./src/prisma/schema.prisma
  ```

### 6. CORS Blocked in Browser
* **Symptom**: Browser console shows `Access-Control-Allow-Origin header missing`.
* **Fix**: Ensure `FRONTEND_URL` and `ADMIN_URL` in `.env` match the exact domain/IP you are typing in your browser (e.g. `http://195.35.x.x:3000` or `https://yourdomain.com`).

### 7. SMTP Connection Warning (`ECONNREFUSED 127.0.0.1:1025`)
* **Symptom**: Backend logs display `WARN [SmtpEmailProvider] SMTP connection verification failed`.
* **Behavior**: Normal in local dev without Mailpit. The system gracefully catches this and logs outgoing emails to the console without interrupting order placement.
* **Fix (Production)**: Provide real SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) in `.env`.

### 8. Out of Memory (OOM) During Docker Build on VPS
* **Symptom**: Build process terminates with `Killed` or exit code 137.
* **Fix**: Ensure at least 4 GB of swap is active:
  ```bash
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```
