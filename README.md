# Sridattam E-Commerce Platform

Sridattam is an enterprise-grade e-commerce monorepo encompassing the customer storefront, staff administration portal, and central NestJS backend API.

---

## 🏛️ Architecture Overview

The system consists of five containerized services orchestrated via Docker Compose:

| Service | Technology | Port | Description |
| :--- | :--- | :---: | :--- |
| **Customer Storefront** | Next.js 14 (App Router) + Tailwind CSS | `3000` | Customer-facing shopping & checkout experience |
| **Staff Admin Portal** | Next.js 14 + Radix UI + Recharts | `3001` | Role-based catalog, order, and operations management |
| **Backend REST API** | NestJS 11 + Prisma ORM 7 + BullMQ | `5000` | Central business logic, authentication, and payments |
| **PostgreSQL Database** | PostgreSQL 15 (Alpine) | `5432` | Relational database (`sridattam_dev_db`) |
| **Redis Cache & Queue** | Redis 7 (Alpine) | `6379` | Cache-aside layer, session store & task queues |

---

## 📋 System Requirements

See [`requirements.txt`](./requirements.txt) for the complete dependency and version list.

* **Operating System**: Linux (Ubuntu 22.04/24.04 LTS recommended) or Windows 10/11 with WSL 2.
* **Hardware / VPS**:
  * **Minimum (Testing/Staging)**: 1 vCPU, 4 GB RAM (+ 4 GB Swap enabled), 50 GB NVMe SSD.
  * **Recommended (Production - e.g. Hostinger KVM 2 / KVM 4)**: 2–4 vCPU, 8 GB RAM, 100 GB NVMe SSD.
* **Runtimes**:
  * Docker Engine `>= 24.0.0`
  * Docker Compose (v2 plugin) `>= 2.20.0`
  * Node.js `>= 20.0.0` (LTS) & npm `>= 10.0.0`
  * Python `>= 3.10` (for automation test suite)

---

## 🚀 Quick Start & Deployment

### Option A: 1-Click Automated Setup on Linux VPS (Hostinger, AWS, etc.)
On a fresh Ubuntu/Debian server, run:

```bash
git clone https://github.com/Aayush-Forge/ECOM-Master.git
cd ECOM-Master
git checkout testing_draft

# Run the 1-click installer
sudo bash deploy.sh
```

**What `deploy.sh` does automatically:**
1. Configures 4 GB swap to prevent out-of-memory errors during container builds.
2. Installs Docker Engine and Docker Compose if not already present.
3. Auto-detects the VPS public IP and updates environment URLs.
4. Builds and launches all 5 Docker containers.
5. Pushes Prisma database schemas and runs `prisma db seed`.

---

### Option B: 1-Click Local Setup on Windows
1. Make sure **Docker Desktop** is installed and running with WSL 2 backend.
2. In PowerShell or File Explorer, run:
   ```powershell
   cd ECOM-Master
   .\start.bat
   ```
*(Alternatively, run `docker compose up -d`)*

---

## 🔐 Default Test Accounts

After running the database seed, the following accounts are pre-configured:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sridattam.com` | `password123` | Full administrative access across all modules |
| **Editor** | `editor@sridattam.com` | `password123` | Catalog CRUD (products, categories, discounts) & orders |
| **Read-Only** | `read_only@sridattam.com` | `password123` | Inspect-only view for audit logs and transaction records |
| **Customer** | `customer@sridattam.com` | `password123` | Customer storefront shopping account |

---

## 🛠️ Database Management

Database migrations and schema definitions are located in `backend/src/prisma/`:

* **Synchronize Schema**:
  ```bash
  docker compose exec backend npx prisma db push --schema=./src/prisma/schema.prisma
  ```
* **Populate Demo Products & Accounts**:
  ```bash
  docker compose exec backend npx prisma db seed
  ```
* **Open Prisma Studio (Database GUI)**:
  ```bash
  docker compose exec backend npx prisma studio --schema=./src/prisma/schema.prisma
  ```

---

## 🧪 Testing

### Automated Backend API Test Suite (Python)
Install test dependencies and run the end-to-end verification suite:

```bash
pip install -r requirements.txt
python backend_test.py
```

### End-to-End Security & Role Tests (Node.js)
```bash
node tests/e2e_security_test.mjs
node tests/role_routing_test.mjs
```

---

## ⚙️ Environment Variables Reference (`.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://sridattam_admin:...@postgres:5432/sridattam_dev_db` |
| `BACKEND_PUBLIC_URL` | Public-facing URL for the REST API | `http://localhost:5000` (or `http://<VPS_IP>:5000`) |
| `FRONTEND_URL` | Public URL for the Customer Storefront | `http://localhost:3000` (or `http://<VPS_IP>:3000`) |
| `ADMIN_URL` | Public URL for the Staff Admin Portal | `http://localhost:3001` (or `http://<VPS_IP>:3001`) |
| `JWT_SECRET` | Secret key for signing auth tokens | String |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | String |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | Hexadecimal string |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key ID | Alphanumeric string |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Access Key | Alphanumeric string |
| `R2_BUCKET_NAME` | Cloudflare R2 Bucket Name | `sridattam-product-media` |
| `R2_PUBLIC_BASE_URL` | Public CDN base URL for uploaded media | `https://pub-xxxx.r2.dev` |
| `RAZORPAY_KEY_ID` | Razorpay Gateway Test/Live Key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Gateway Secret | String |
| `EMAIL_PROVIDER` | Notification transport mode | `console` or `smtp` |

---

## 🌐 Custom Domain & Production Nginx Setup

To connect a custom domain (e.g. `sridattam.in`) on your VPS:
1. Point your DNS **A Records** to your VPS IP:
   - `@` and `www` $\rightarrow$ Storefront (Port `3000`)
   - `admin` $\rightarrow$ Admin Portal (Port `3001`)
   - `api` $\rightarrow$ Backend API (Port `5000`)
2. Configure Nginx reverse proxy on ports `80` and `443` (SSL).
3. Run `certbot --nginx` for free automated Let's Encrypt SSL certificates.
4. Update `.env` with your HTTPS domain URLs and restart containers with `docker compose up -d`.
