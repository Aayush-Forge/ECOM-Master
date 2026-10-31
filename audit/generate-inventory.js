const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin-portal');

function getFiles(dir, ext = []) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.next' || file === 'dist' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, ext));
    } else {
      if (ext.length === 0 || ext.some(e => file.endsWith(e))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// 1. Backend Routes
const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json'), 'utf8'));

// 2. Prisma Schema Parsing
const prismaPath = path.join(BACKEND_DIR, 'src', 'prisma', 'schema.prisma');
const prismaContent = fs.readFileSync(prismaPath, 'utf8');

const enumRegex = /enum\s+([a-zA-Z0-9_]+)\s*\{([^}]+)\}/g;
const enums = [];
let enumMatch;
while ((enumMatch = enumRegex.exec(prismaContent)) !== null) {
  const name = enumMatch[1];
  const values = enumMatch[2].trim().split(/\s+/).filter(v => v && !v.startsWith('//'));
  enums.push({ name, values });
}

const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
const models = [];
let modelMatch;
while ((modelMatch = modelRegex.exec(prismaContent)) !== null) {
  const modelName = modelMatch[1];
  const body = modelMatch[2];
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
  
  const fields = [];
  const indexes = [];
  let tableName = modelName;

  for (const line of lines) {
    if (line.startsWith('@@map(')) {
      const m = line.match(/@@map\("([^"]+)"\)/);
      if (m) tableName = m[1];
    } else if (line.startsWith('@@index(') || line.startsWith('@@unique(') || line.startsWith('@@id(')) {
      indexes.push(line);
    } else {
      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];
      const attributes = parts.slice(2).join(' ');
      fields.push({ fieldName, fieldType, attributes });
    }
  }
  models.push({ modelName, tableName, fields, indexes });
}

// 3. Frontend pages
const storefrontPages = getFiles(path.join(ROOT_DIR, 'app'), ['.js', '.jsx', '.tsx', '.ts'])
  .filter(f => path.basename(f).startsWith('page.'))
  .map(f => {
    let rel = path.relative(path.join(ROOT_DIR, 'app'), path.dirname(f)).replace(/\\/g, '/');
    return rel === '' ? '/' : `/${rel}`;
  });

const adminPages = getFiles(path.join(ADMIN_DIR, 'app'), ['.js', '.jsx', '.tsx', '.ts'])
  .filter(f => path.basename(f).startsWith('page.'))
  .map(f => {
    let rel = path.relative(path.join(ADMIN_DIR, 'app'), path.dirname(f)).replace(/\\/g, '/');
    rel = rel.replace(/\(dashboard\)\/?/, '');
    return rel === '' ? '/' : `/${rel}`;
  });

// 4. Generate Inventory Markdown
let md = `# SYSTEM INVENTORY & AUDIT BASELINE

> Generated on: 2026-10-31  
> Scope: Backend (NestJS), Storefront (Next.js 14), Admin Portal (Next.js 14/16), Database (PostgreSQL + Prisma), Cache/Queue (Redis + BullMQ)

---

## 1. REPOSITORY STRUCTURE & ENVIRONMENT

### 1.1 Root & Sub-projects
- **Customer Storefront**: \`./\` (Next.js 14.2.3, React 18.3.1, TailwindCSS 3.4.1)
- **Staff Admin Portal**: \`./admin-portal/\` (Next.js 16.3.4 / React 19, Radix UI, TailwindCSS)
- **Central API Backend**: \`./backend/\` (NestJS 11.0.1, Express 5, Prisma 7.9.1, PostgreSQL 15, Redis 7, BullMQ 6.3.11)
- **Docker Compose**: \`./docker-compose.yml\` defining services: \`postgres\`, \`redis\`, \`backend\`, \`admin-portal\`, \`storefront\`
- **Database Initializer**: \`./backend/data/database_dump.sql\` mounted into PostgreSQL container initdb.

### 1.2 Package.json Scripts
| Project | Script | Command | Purpose |
| :--- | :--- | :--- | :--- |
| **Storefront** | \`dev\` | \`next dev --port 3000\` | Development server on port 3000 |
| **Storefront** | \`build\` | \`next build\` | Production build |
| **Storefront** | \`start\` | \`next start\` | Production server |
| **Storefront** | \`test:e2e\` | \`playwright test\` | Run Playwright test suite |
| **Backend** | \`prebuild\` | \`prisma generate --schema=./src/prisma/schema.prisma\` | Generate Prisma client |
| **Backend** | \`build\` | \`nest build\` | Compile NestJS TypeScript |
| **Backend** | \`start:prod\` | \`node dist/main\` | Launch production backend |
| **Backend** | \`test\` | \`jest\` | Run unit tests |
| **Backend** | \`test:e2e\` | \`jest --config ./test/jest-e2e.json\` | Run NestJS E2E tests |
| **Admin Portal** | \`dev\` | \`next dev --port 3001\` | Development server on port 3001 |
| **Admin Portal** | \`build\` | \`next build\` | Production build |
| **Admin Portal** | \`start\` | \`next start --port 3001\` | Production server on port 3001 |

### 1.3 Environment Variables Inventory
| Variable | Expected Scope | Local/Dev Default | Sensitive / Risk Note |
| :--- | :--- | :--- | :--- |
| \`PORT\` | Backend / Storefront / Admin | 5000 / 3000 / 3001 | Public port bindings |
| \`DATABASE_URL\` | Backend | \`postgresql://sridattam_admin:...@localhost:5432/sridattam_dev_db\` | Database connection string |
| \`REDIS_HOST\` / \`REDIS_PORT\` | Backend | \`localhost\` / \`6379\` | In-memory cache & BullMQ queue |
| \`JWT_SECRET\` | Backend | \`sridattam-dev-jwt-access-secret-key-2026\` | **Auth security token signing** |
| \`JWT_REFRESH_SECRET\` | Backend | \`sridattam-dev-jwt-refresh-secret-key-2026\` | **Refresh token signing** |
| \`RAZORPAY_KEY_ID\` | Backend, Storefront | \`rzp_test_TeDsxH8VAgL0ZA\` | Test payment gateway public key |
| \`RAZORPAY_KEY_SECRET\` | Backend | Test secret key in \`backend/.env\` | **Payment signature & capture secret** |
| \`RAZORPAY_WEBHOOK_SECRET\` | Backend | Falls back to \`RAZORPAY_KEY_SECRET\` | Webhook HMAC verification |
| \`R2_ACCOUNT_ID\` | Backend | Configured in \`backend/.env\` | Cloudflare R2 object storage |
| \`R2_ACCESS_KEY_ID\` | Backend | Configured in \`backend/.env\` | S3 API credential |
| \`R2_SECRET_ACCESS_KEY\` | Backend | Configured in \`backend/.env\` | S3 API secret key |
| \`R2_BUCKET_NAME\` | Backend | \`sridattam-product-media\` | Public asset bucket |
| \`R2_PUBLIC_BASE_URL\` | Backend | CDN endpoint | Public image distribution |
| \`EMAIL_PROVIDER\` | Backend | \`smtp\` or \`console\` | Email provider switch |
| \`SMTP_HOST\` / \`SMTP_PORT\` | Backend | \`localhost\` / \`1025\` | Mailpit / SMTP mail delivery |

---

## 2. DATABASE INVENTORY (PRISMA SCHEMA & MIGRATIONS)

### 2.1 Prisma Enums (${enums.length} Enums)
`;

enums.forEach(e => {
  md += `\n#### \`${e.name}\`\nValues: ${e.values.map(v => `\`${v}\``).join(', ')}\n`;
});

md += `\n### 2.2 Database Models (${models.length} Models / Tables)\n`;

models.forEach(m => {
  md += `\n#### Model \`${m.modelName}\` (Table: \`${m.tableName}\`)\n`;
  md += `| Field | Type | Attributes |\n| :--- | :--- | :--- |\n`;
  m.fields.forEach(f => {
    md += `| \`${f.fieldName}\` | \`${f.fieldType}\` | ${f.attributes.replace(/\|/g, '\\|') || '-'} |\n`;
  });
  if (m.indexes.length > 0) {
    md += `**Constraints / Indexes:**\n`;
    m.indexes.forEach(idx => {
      md += `- \`${idx}\`\n`;
    });
  }
});

md += `\n### 2.3 Prisma Migrations History
- \`backend/src/prisma/migrations/20261001000000_init\`: Initial comprehensive schema setup.
- \`backend/src/prisma/migrations/20261003183000_add_discount_code\`: Adds discount code column.
- \`backend/src/prisma/migrations/20261007224000_add_order_tracking\`: Adds order tracking URL & number.
- \`backend/src/prisma/migrations/20261020113000_add_email_template_wording\`: Adds email template wording columns.
- \`backend/src/prisma/migrations/20261027223000_add_shipping_module\`: Adds shipping template and order shipping fields.
- Note: Legacy directory \`backend/prisma/migrations\` also exists with 3 older migrations (\`20260820213955_init\`, \`20260905071855\`, \`20260927070918\`).

---

## 3. BACKEND API INVENTORY (${routes.length} ENDPOINTS)

| # | Method | Path | Controller | Access / Guard | DTOs / Params |
| :-: | :--- | :--- | :--- | :--- | :--- |
`;

routes.forEach((r, idx) => {
  md += `| ${idx + 1} | \`${r.httpMethod}\` | \`${r.path}\` | \`${r.controller}\` | ${r.isPublic ? '`@Public()`' : `\`${r.roles}\``} | ${r.dtos.replace(/\|/g, '\\|')} |\n`;
});

md += `\n---

## 4. FRONTEND PAGES & ROUTES INVENTORY

### 4.1 Customer Storefront Pages (${storefrontPages.length} Pages)
`;

storefrontPages.forEach(p => {
  md += `- \`${p}\`\n`;
});

md += `\n### 4.2 Staff Admin Portal Pages (${adminPages.length} Pages)
`;

adminPages.forEach(p => {
  md += `- \`${p}\`\n`;
});

md += `\n---

## 5. ROLES & PERMISSIONS ARCHITECTURE

### 5.1 Defined Roles & Hierarchy
- **\`admin\`** (Rank 3): Super-administrator with unrestricted access to all endpoints, configurations, users, and audit logs.
- **\`editor\`** (Rank 2): Staff editor permitted to manage catalog, categories, products, orders, clubbings, discounts, and reviews. Denied access to staff user management, accounting, company profile, and audit logs.
- **\`read_only\`** / **\`employee\`** (Rank 1): Staff viewer with read-only view of orders and payments. Denied mutation capabilities.
- **\`customer\`** (Rank 0): End-user shopper. Permitted customer account endpoints (\`/account/*\`, cart, orders placement, own profile). Blocked from staff endpoints and admin portal.

### 5.2 Backend Protection Model
- **Fail-Closed Default**: Global guards \`ThrottlerGuard\`, \`JwtAuthGuard\`, and \`RolesGuard\` are registered at the application level in \`AppModule\`.
- Any endpoint without \`@Public()\` strictly requires a valid JWT Bearer token.
- Any endpoint without \`@Public()\` AND without \`@Roles(...)\` fails closed with \`403 Forbidden\` (enforced in \`RolesGuard\`).

### 5.3 Frontend Route Protection Model
- Storefront: \`middleware.js\` intercepts \`/admin\` and redirects to \`http://localhost:3001\`. Customer profile pages (\`/account/*\`) check \`useAuth()\` and redirect unauthenticated users to \`/login\`.
- Admin Portal: \`DashboardLayout\` (\`admin-portal/app/(dashboard)/layout.jsx\`) inspects \`useAuth()\`. Unauthenticated users or users with role \`customer\` are immediately redirected to \`/login\`. Role route access is checked against \`ROLE_ALLOWED_ROUTE_PREFIXES\`.

---

## 6. THIRD-PARTY INTEGRATIONS

1. **Razorpay Payments**:
   - Order creation via Razorpay Orders API (\`POST /orders/checkout\` $\\rightarrow$ \`razorpay.orders.create\`).
   - Signature verification using HMAC SHA-256 (\`POST /payments/verify\`).
   - Webhook processing (\`POST /payments/webhook\`) handling \`payment.captured\`, \`payment.failed\`, \`refund.processed\`.
2. **Cloudflare R2 Object Storage (AWS S3 SDK Client)**:
   - S3-compatible file storage for product media, banner images, and legal company documents.
   - Files uploaded to bucket \`sridattam-product-media\` and served through public CDN URL.
3. **BullMQ & Redis**:
   - Asynchronous queue \`email-notifications\` offloading email dispatches.
   - Redis cache layer for cart sessions, product pricing, and rate throttling.
4. **Nodemailer / SMTP / Console**:
   - Dynamic provider selection based on \`EMAIL_PROVIDER\` (\`smtp\` vs \`console\`).
   - HTML templating engine for order confirmation, shipping updates, cancellation, and refund notices.
5. **Sentry Error Tracking**:
   - Sentry instrumentation initialized in \`instrument.ts\` and \`SentryGlobalFilter\` registered in \`AppModule\`.

---

## 7. DOCUMENTATION VS IMPLEMENTATION (BASELINE GAPS)

Based on comparison between \`README.md\`, \`FINAL_REVIEW.md\`, \`ADMIN_PAYMENTS_AUDIT.md\`, and actual source code:
1. **Shipping Route Access in Admin Portal**:
   - \`ROLE_NAV_ITEMS.editor\` displays \`Shipping\` (\`/shipping\`), but \`ROLE_ALLOWED_ROUTE_PREFIXES.editor\` omits \`/shipping\`, triggering an automatic redirect loop/kickback to \`/overview\` for editor staff.
2. **Storefront Residual Admin/Staff Routes**:
   - Storefront contains \`/admin/accounting\`, \`/admin/clubbings\`, and \`/staff/clubbings\`. The middleware only checks exact matches for \`/admin\` and \`/admin/overview\`, allowing residual admin routes to load in the storefront.
3. **Dual Prisma Migrations Folders**:
   - \`backend/prisma/migrations\` contains 3 migrations with \`generator.client\` target, while \`backend/src/prisma/migrations\` contains 5 migrations. In \`backend/package.json\`, schema path is explicitly \`./src/prisma/schema.prisma\`.
4. **Razorpay Signature Exposure in Admin Listing**:
   - \`GET /admin/payments\` returns payment entity data. Need to verify if cryptographic \`razorpaySignature\` is sanitized or leaked in API responses.
5. **Product Draft Leak via Query Parameter**:
   - \`GET /products\` with \`?admin=true\`. Need to verify whether unauthenticated users can access draft and archived items without authentication.
`;

fs.writeFileSync(path.join(__dirname, 'INVENTORY.md'), md);
console.log('Successfully wrote audit/INVENTORY.md');
