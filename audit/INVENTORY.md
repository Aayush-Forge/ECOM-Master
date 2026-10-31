# SYSTEM INVENTORY & AUDIT BASELINE

> Generated on: 2026-10-31  
> Scope: Backend (NestJS), Storefront (Next.js 14), Admin Portal (Next.js 14/16), Database (PostgreSQL + Prisma), Cache/Queue (Redis + BullMQ)

---

## 1. REPOSITORY STRUCTURE & ENVIRONMENT

### 1.1 Root & Sub-projects
- **Customer Storefront**: `./` (Next.js 14.2.3, React 18.3.1, TailwindCSS 3.4.1)
- **Staff Admin Portal**: `./admin-portal/` (Next.js 16.3.4 / React 19, Radix UI, TailwindCSS)
- **Central API Backend**: `./backend/` (NestJS 11.0.1, Express 5, Prisma 7.9.1, PostgreSQL 15, Redis 7, BullMQ 6.3.11)
- **Docker Compose**: `./docker-compose.yml` defining services: `postgres`, `redis`, `backend`, `admin-portal`, `storefront`
- **Database Initializer**: `./backend/data/database_dump.sql` mounted into PostgreSQL container initdb.

### 1.2 Package.json Scripts
| Project | Script | Command | Purpose |
| :--- | :--- | :--- | :--- |
| **Storefront** | `dev` | `next dev --port 3000` | Development server on port 3000 |
| **Storefront** | `build` | `next build` | Production build |
| **Storefront** | `start` | `next start` | Production server |
| **Storefront** | `test:e2e` | `playwright test` | Run Playwright test suite |
| **Backend** | `prebuild` | `prisma generate --schema=./src/prisma/schema.prisma` | Generate Prisma client |
| **Backend** | `build` | `nest build` | Compile NestJS TypeScript |
| **Backend** | `start:prod` | `node dist/main` | Launch production backend |
| **Backend** | `test` | `jest` | Run unit tests |
| **Backend** | `test:e2e` | `jest --config ./test/jest-e2e.json` | Run NestJS E2E tests |
| **Admin Portal** | `dev` | `next dev --port 3001` | Development server on port 3001 |
| **Admin Portal** | `build` | `next build` | Production build |
| **Admin Portal** | `start` | `next start --port 3001` | Production server on port 3001 |

### 1.3 Environment Variables Inventory
| Variable | Expected Scope | Local/Dev Default | Sensitive / Risk Note |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend / Storefront / Admin | 5000 / 3000 / 3001 | Public port bindings |
| `DATABASE_URL` | Backend | `postgresql://sridattam_admin:...@localhost:5432/sridattam_dev_db` | Database connection string |
| `REDIS_HOST` / `REDIS_PORT` | Backend | `localhost` / `6379` | In-memory cache & BullMQ queue |
| `JWT_SECRET` | Backend | `sridattam-dev-jwt-access-secret-key-2026` | **Auth security token signing** |
| `JWT_REFRESH_SECRET` | Backend | `sridattam-dev-jwt-refresh-secret-key-2026` | **Refresh token signing** |
| `RAZORPAY_KEY_ID` | Backend, Storefront | `rzp_test_TeDsxH8VAgL0ZA` | Test payment gateway public key |
| `RAZORPAY_KEY_SECRET` | Backend | Test secret key in `backend/.env` | **Payment signature & capture secret** |
| `RAZORPAY_WEBHOOK_SECRET` | Backend | Falls back to `RAZORPAY_KEY_SECRET` | Webhook HMAC verification |
| `R2_ACCOUNT_ID` | Backend | Configured in `backend/.env` | Cloudflare R2 object storage |
| `R2_ACCESS_KEY_ID` | Backend | Configured in `backend/.env` | S3 API credential |
| `R2_SECRET_ACCESS_KEY` | Backend | Configured in `backend/.env` | S3 API secret key |
| `R2_BUCKET_NAME` | Backend | `sridattam-product-media` | Public asset bucket |
| `R2_PUBLIC_BASE_URL` | Backend | CDN endpoint | Public image distribution |
| `EMAIL_PROVIDER` | Backend | `smtp` or `console` | Email provider switch |
| `SMTP_HOST` / `SMTP_PORT` | Backend | `localhost` / `1025` | Mailpit / SMTP mail delivery |

---

## 2. DATABASE INVENTORY (PRISMA SCHEMA & MIGRATIONS)

### 2.1 Prisma Enums (11 Enums)

#### `ProductStatus`
Values: `draft`, `active`, `archived`

#### `ProductType`
Values: `simple`, `variable`

#### `ClubbingRuleType`
Values: `fixed_price_bundle`, `percentage_off_bundle`, `custom_product_clubbing`

#### `CartStatus`
Values: `active`, `converted`, `abandoned`

#### `OrderStatus`
Values: `cart`, `payment_pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`

#### `OrderAddressType`
Values: `billing`, `shipping`

#### `PaymentStatus`
Values: `CREATED`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`

#### `PaymentWebhookStatus`
Values: `received`, `processed`, `failed`

#### `UserRole`
Values: `admin`, `editor`, `read_only`, `customer`

#### `NotificationStatus`
Values: `sent`, `failed`

#### `ShippingRateType`
Values: `weight`, `order_value`

### 2.2 Database Models (22 Models / Tables)

#### Model `Product` (Table: `products`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `sku` | `String` | @unique |
| `title` | `String` | - |
| `slug` | `String` | @unique |
| `description` | `String` | - |
| `shortDescription` | `String` | @map("short_description") |
| `basePrice` | `Decimal` | @map("base_price") |
| `compareAtPrice` | `Decimal?` | @map("compare_at_price") |
| `salePrice` | `Decimal?` | @map("sale_price") |
| `weight` | `Decimal?` | - |
| `length` | `Decimal?` | - |
| `width` | `Decimal?` | - |
| `height` | `Decimal?` | - |
| `categoryId` | `String` | @map("category_id") @db.Uuid |
| `status` | `ProductStatus` | - |
| `images` | `String[]` | - |
| `customFields` | `Json` | @map("custom_fields") |
| `stockQuantity` | `Int` | @map("stock_quantity") |
| `productType` | `ProductType` | @default(simple) @map("product_type") |
| `attributes` | `Json?` | - |
| `variations` | `Json?` | - |
| `metaTitle` | `String?` | @map("meta_title") |
| `metaDescription` | `String?` | @map("meta_description") |
| `metaKeywords` | `String?` | @map("meta_keywords") |
| `version` | `Int` | @default(1) |
| `shippingTemplateId` | `String?` | @map("shipping_template_id") @db.Uuid |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |
| `category` | `Category` | @relation(fields: [categoryId], references: [id]) |
| `shippingTemplate` | `ShippingTemplate?` | @relation(fields: [shippingTemplateId], references: [id], onDelete: SetNull) |
| `cartItems` | `CartItem[]` | - |
| `orderItems` | `OrderItem[]` | - |
| `clubbingRules` | `ClubbingRuleProduct[]` | - |
| `reviews` | `Review[]` | - |
**Constraints / Indexes:**
- `@@index([categoryId])`
- `@@index([status])`
- `@@index([shippingTemplateId])`

#### Model `ShippingTemplate` (Table: `shipping_templates`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `name` | `String` | - |
| `carrierName` | `String?` | @default("") @map("carrier_name") |
| `rateType` | `ShippingRateType` | @default(order_value) @map("rate_type") |
| `slabs` | `Json` | - |
| `freeShippingThreshold` | `Decimal?` | @map("free_shipping_threshold") @db.Decimal(10, 2) |
| `isDefault` | `Boolean` | @default(false) @map("is_default") |
| `isEnabled` | `Boolean` | @default(true) @map("is_enabled") |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |
| `products` | `Product[]` | - |

#### Model `Review` (Table: `reviews`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `productId` | `String` | @map("product_id") @db.Uuid |
| `product` | `Product` | @relation(fields: [productId], references: [id], onDelete: Cascade) |
| `customerName` | `String` | @map("customer_name") |
| `customerEmail` | `String?` | @map("customer_email") |
| `customerPhone` | `String?` | @map("customer_phone") |
| `orderId` | `String?` | @map("order_id") @db.Uuid |
| `order` | `Order?` | @relation(fields: [orderId], references: [id], onDelete: SetNull) |
| `stars` | `Int` | - |
| `description` | `String` | - |
| `isVerifiedBuyer` | `Boolean` | @default(true) @map("is_verified_buyer") |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
**Constraints / Indexes:**
- `@@index([productId])`
- `@@index([customerEmail])`
- `@@index([customerPhone])`
- `@@index([orderId])`

#### Model `Category` (Table: `categories`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `parentId` | `String?` | @map("parent_id") @db.Uuid |
| `name` | `String` | - |
| `slug` | `String` | @unique |
| `description` | `String?` | - |
| `image` | `String?` | - |
| `metaTitle` | `String?` | @map("meta_title") |
| `metaDescription` | `String?` | @map("meta_description") |
| `parent` | `Category?` | @relation("CategoryTree", fields: [parentId], references: [id]) |
| `children` | `Category[]` | @relation("CategoryTree") |
| `products` | `Product[]` | - |
| `clubbingRules` | `ClubbingRule[]` | - |

#### Model `ClubbingRule` (Table: `clubbing_rules`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `name` | `String` | - |
| `eventName` | `String?` | @map("event_name") |
| `tagline` | `String?` | - |
| `description` | `String?` | @db.Text |
| `type` | `ClubbingRuleType` | @default(custom_product_clubbing) |
| `code` | `String?` | @unique |
| `requiredQuantity` | `Int` | @default(1) @map("required_quantity") |
| `fixedPrice` | `Decimal?` | @map("fixed_price") @db.Decimal(10, 2) |
| `percentageOff` | `Decimal?` | @map("percentage_off") @db.Decimal(5, 2) |
| `applicableCategoryId` | `String?` | @map("applicable_category_id") @db.Uuid |
| `bannerImageDesktop` | `String?` | @map("banner_image_desktop") @db.VarChar(500) |
| `bannerImageMobile` | `String?` | @map("banner_image_mobile") @db.VarChar(500) |
| `bannerKeyDesktop` | `String?` | @map("banner_key_desktop") @db.VarChar(255) |
| `bannerKeyMobile` | `String?` | @map("banner_key_mobile") @db.VarChar(255) |
| `featuredOnHomepage` | `Boolean` | @default(true) @map("featured_on_homepage") |
| `showInHero` | `Boolean` | @default(true) @map("show_in_hero") |
| `heroCtaText` | `String?` | @default("Shop Festive Deals") @map("hero_cta_text") |
| `startsAt` | `DateTime?` | @map("starts_at") |
| `endsAt` | `DateTime?` | @map("ends_at") |
| `usageLimit` | `Int?` | @map("usage_limit") |
| `usageCount` | `Int` | @default(0) @map("usage_count") |
| `isActive` | `Boolean` | @default(true) @map("is_active") |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |
| `applicableCategory` | `Category?` | @relation(fields: [applicableCategoryId], references: [id]) |
| `products` | `ClubbingRuleProduct[]` | - |
**Constraints / Indexes:**
- `@@index([applicableCategoryId])`
- `@@index([isActive])`
- `@@index([startsAt])`
- `@@index([endsAt])`

#### Model `ClubbingRuleProduct` (Table: `clubbing_rule_products`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `ruleId` | `String` | @map("rule_id") @db.Uuid |
| `productId` | `String` | @map("product_id") @db.Uuid |
| `clubbingPrice` | `Decimal?` | @map("clubbing_price") @db.Decimal(10, 2) |
| `discountPercentage` | `Decimal?` | @map("discount_percentage") @db.Decimal(5, 2) |
| `sortOrder` | `Int` | @default(0) @map("sort_order") |
| `rule` | `ClubbingRule` | @relation(fields: [ruleId], references: [id], onDelete: Cascade) |
| `product` | `Product` | @relation(fields: [productId], references: [id], onDelete: Cascade) |
**Constraints / Indexes:**
- `@@id([ruleId, productId])`

#### Model `Cart` (Table: `carts`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `customerId` | `String?` | @map("customer_id") @db.Uuid |
| `sessionToken` | `String` | @unique @map("session_token") |
| `status` | `CartStatus` | - |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |
| `customer` | `User?` | @relation(fields: [customerId], references: [id]) |
| `items` | `CartItem[]` | - |
**Constraints / Indexes:**
- `@@index([customerId])`

#### Model `CartItem` (Table: `cart_items`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `cartId` | `String` | @map("cart_id") @db.Uuid |
| `productId` | `String` | @map("product_id") @db.Uuid |
| `variationId` | `String?` | @map("variation_id") |
| `quantity` | `Int` | - |
| `unitPriceSnapshot` | `Decimal` | @map("unit_price_snapshot") |
| `cart` | `Cart` | @relation(fields: [cartId], references: [id], onDelete: Cascade) |
| `product` | `Product` | @relation(fields: [productId], references: [id]) |
**Constraints / Indexes:**
- `@@unique([cartId, productId, variationId])`
- `@@index([cartId])`
- `@@index([productId])`

#### Model `Order` (Table: `orders`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `orderNumber` | `String` | @unique @map("order_number") |
| `invoiceNumber` | `String?` | @map("invoice_number") |
| `customerId` | `String?` | @map("customer_id") @db.Uuid |
| `status` | `OrderStatus` | - |
| `subtotal` | `Decimal` | - |
| `discountTotal` | `Decimal` | @map("discount_total") |
| `taxTotal` | `Decimal` | @map("tax_total") |
| `shippingTotal` | `Decimal` | @map("shipping_total") |
| `grandTotal` | `Decimal` | @map("grand_total") |
| `shippingLabelStatus` | `String?` | @default("pending") @map("shipping_label_status") |
| `couponCode` | `String?` | @map("coupon_code") |
| `email` | `String?` | - |
| `currency` | `String` | @default("INR") |
| `trackingUrl` | `String?` | @map("tracking_url") |
| `trackingNumber` | `String?` | @map("tracking_number") |
| `shippingTemplateName` | `String?` | @map("shipping_template_name") |
| `shippingCarrier` | `String?` | @map("shipping_carrier") |
| `shippingSnapshot` | `Json?` | @map("shipping_snapshot") |
| `placedAt` | `DateTime?` | @map("placed_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `customer` | `User?` | @relation(fields: [customerId], references: [id]) |
| `items` | `OrderItem[]` | - |
| `statusHistory` | `OrderStatusHistory[]` | - |
| `addresses` | `OrderAddress[]` | - |
| `payments` | `Payment[]` | - |
| `notifications` | `NotificationLog[]` | - |
| `reviews` | `Review[]` | - |
**Constraints / Indexes:**
- `@@index([customerId])`
- `@@index([status])`

#### Model `OrderItem` (Table: `order_items`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `orderId` | `String` | @map("order_id") @db.Uuid |
| `productId` | `String` | @map("product_id") @db.Uuid |
| `titleSnapshot` | `String` | @map("title_snapshot") |
| `skuSnapshot` | `String` | @map("sku_snapshot") |
| `unitPriceSnapshot` | `Decimal` | @map("unit_price_snapshot") |
| `quantity` | `Int` | - |
| `lineTotal` | `Decimal` | @map("line_total") |
| `variantId` | `String?` | @map("variant_id") |
| `attributesSnapshot` | `Json?` | @map("attributes_snapshot") |
| `order` | `Order` | @relation(fields: [orderId], references: [id], onDelete: Cascade) |
| `product` | `Product` | @relation(fields: [productId], references: [id]) |
**Constraints / Indexes:**
- `@@index([orderId])`
- `@@index([productId])`

#### Model `OrderStatusHistory` (Table: `order_status_history`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `orderId` | `String` | @map("order_id") @db.Uuid |
| `fromStatus` | `OrderStatus?` | @map("from_status") |
| `toStatus` | `OrderStatus` | @map("to_status") |
| `changedById` | `String?` | @map("changed_by_id") @db.Uuid |
| `changedBySystem` | `String?` | @map("changed_by_system") |
| `note` | `String?` | - |
| `changedAt` | `DateTime` | @default(now()) @map("changed_at") |
| `order` | `Order` | @relation(fields: [orderId], references: [id], onDelete: Cascade) |
| `changedByUser` | `User?` | @relation(fields: [changedById], references: [id]) |
**Constraints / Indexes:**
- `@@index([orderId])`
- `@@index([toStatus])`

#### Model `OrderAddress` (Table: `order_addresses`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `orderId` | `String` | @map("order_id") @db.Uuid |
| `type` | `OrderAddressType` | - |
| `fullName` | `String` | @map("full_name") |
| `phone` | `String` | - |
| `addressLine1` | `String` | @map("address_line1") |
| `addressLine2` | `String?` | @map("address_line2") |
| `city` | `String` | - |
| `state` | `String` | - |
| `postalCode` | `String` | @map("postal_code") |
| `country` | `String` | - |
| `order` | `Order` | @relation(fields: [orderId], references: [id], onDelete: Cascade) |
**Constraints / Indexes:**
- `@@index([orderId])`

#### Model `Payment` (Table: `payments`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `orderId` | `String` | @map("order_id") @db.Uuid |
| `order` | `Order` | @relation(fields: [orderId], references: [id]) |
| `razorpayOrderId` | `String` | @unique @map("razorpay_order_id") |
| `razorpayPaymentId` | `String?` | @map("razorpay_payment_id") |
| `razorpaySignature` | `String?` | @map("razorpay_signature") |
| `status` | `PaymentStatus` | @default(CREATED) |
| `amount` | `Decimal` | - |
| `currency` | `String` | @default("INR") |
| `method` | `String?` | - |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |
| `webhookEvents` | `PaymentWebhookEvent[]` | - |
**Constraints / Indexes:**
- `@@index([orderId])`

#### Model `PaymentWebhookEvent` (Table: `payment_webhook_events`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `razorpayEventId` | `String` | @unique @map("razorpay_event_id") |
| `eventType` | `String` | @map("event_type") |
| `payload` | `Json` | - |
| `processedAt` | `DateTime?` | @map("processed_at") |
| `status` | `PaymentWebhookStatus` | - |
| `payment` | `Payment?` | @relation(fields: [paymentId], references: [id]) |
| `paymentId` | `String?` | @db.Uuid |
**Constraints / Indexes:**
- `@@index([paymentId])`

#### Model `User` (Table: `users`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `email` | `String` | @unique |
| `phone` | `String?` | - |
| `passwordHash` | `String` | @map("password_hash") |
| `role` | `UserRole` | @default(customer) |
| `firstName` | `String` | @map("first_name") |
| `lastName` | `String` | @map("last_name") |
| `isActive` | `Boolean` | @default(true) @map("is_active") |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `carts` | `Cart[]` | - |
| `orders` | `Order[]` | - |
| `addresses` | `Address[]` | - |
| `notifications` | `NotificationLog[]` | - |
| `orderStatusChanges` | `OrderStatusHistory[]` | - |

#### Model `Address` (Table: `addresses`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `userId` | `String` | @map("user_id") @db.Uuid |
| `label` | `String` | - |
| `fullName` | `String` | @map("full_name") |
| `phone` | `String` | - |
| `addressLine1` | `String` | @map("address_line1") |
| `addressLine2` | `String?` | @map("address_line2") |
| `city` | `String` | - |
| `state` | `String` | - |
| `postalCode` | `String` | @map("postal_code") |
| `country` | `String` | - |
| `isDefault` | `Boolean` | @map("is_default") |
| `user` | `User` | @relation(fields: [userId], references: [id], onDelete: Cascade) |
**Constraints / Indexes:**
- `@@index([userId])`

#### Model `EmailTemplate` (Table: `email_templates`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `key` | `String` | @unique |
| `subject` | `String` | - |
| `htmlBody` | `String` | @map("html_body") |
| `variablesSchema` | `Json` | @map("variables_schema") |
| `heading` | `String?` | - |
| `intro` | `String?` | - |
| `footer` | `String?` | - |
| `updatedAt` | `DateTime` | @default(now()) @updatedAt @map("updated_at") |

#### Model `NotificationLog` (Table: `notification_log`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `idempotencyKey` | `String` | @unique @map("idempotency_key") |
| `orderId` | `String?` | @map("order_id") @db.Uuid |
| `userId` | `String?` | @map("user_id") @db.Uuid |
| `recipient` | `String?` | - |
| `templateKey` | `String` | @map("template_key") |
| `sentAt` | `DateTime` | @default(now()) @map("sent_at") |
| `status` | `NotificationStatus` | - |
| `error` | `String?` | - |
| `order` | `Order?` | @relation(fields: [orderId], references: [id]) |
| `user` | `User?` | @relation(fields: [userId], references: [id]) |
**Constraints / Indexes:**
- `@@index([orderId])`
- `@@index([userId])`

#### Model `ShippingSlab` (Table: `shipping_slabs`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `name` | `String` | - |
| `minWeight` | `Float` | @map("min_weight") |
| `maxWeight` | `Float` | @map("max_weight") |
| `destinationRegion` | `String` | @map("destination_region") |
| `rate` | `Float` | - |
| `isActive` | `Boolean` | @default(true) @map("is_active") |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |

#### Model `AuditLog` (Table: `audit_logs`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) |
| `timestamp` | `DateTime` | @default(now()) |
| `userId` | `String` | @map("user_id") |
| `userRole` | `String` | @map("user_role") |
| `actionType` | `String` | @map("action_type") |
| `entityType` | `String` | @map("entity_type") |
| `entityId` | `String` | @map("entity_id") |
| `beforeValue` | `Json?` | @map("before_value") |
| `afterValue` | `Json?` | @map("after_value") |
| `ipAddress` | `String?` | @map("ip_address") |
**Constraints / Indexes:**
- `@@index([userId])`
- `@@index([actionType])`
- `@@index([timestamp])`
- `@@index([entityType, entityId])`

#### Model `CompanyProfile` (Table: `company_profiles`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `legalName` | `String` | @map("legal_name") @db.VarChar(255) |
| `tradeName` | `String?` | @map("trade_name") @db.VarChar(255) |
| `gstin` | `String` | @db.VarChar(15) |
| `pan` | `String?` | @db.VarChar(10) |
| `cin` | `String?` | @db.VarChar(21) |
| `phone` | `String` | @db.VarChar(20) |
| `email` | `String` | @db.VarChar(120) |
| `website` | `String?` | @db.VarChar(255) |
| `logoUrl` | `String?` | @map("logo_url") @db.VarChar(500) |
| `signatureUrl` | `String?` | @map("signature_url") @db.VarChar(500) |
| `addressLine1` | `String` | @map("address_line1") @db.VarChar(255) |
| `addressLine2` | `String?` | @map("address_line2") @db.VarChar(255) |
| `city` | `String` | @db.VarChar(100) |
| `state` | `String` | @db.VarChar(100) |
| `stateCode` | `String` | @map("state_code") @db.VarChar(5) |
| `pincode` | `String` | @db.VarChar(10) |
| `country` | `String` | @default("India") @db.VarChar(50) |
| `bankName` | `String?` | @map("bank_name") @db.VarChar(150) |
| `accountNumber` | `String?` | @map("account_number") @db.VarChar(50) |
| `accountHolder` | `String?` | @map("account_holder") @db.VarChar(255) |
| `accountType` | `String?` | @map("account_type") @db.VarChar(30) |
| `ifscCode` | `String?` | @map("ifsc_code") @db.VarChar(20) |
| `branchName` | `String?` | @map("branch_name") @db.VarChar(150) |
| `upiId` | `String?` | @map("upi_id") @db.VarChar(100) |
| `invoicePrefix` | `String` | @default("INV-") @map("invoice_prefix") @db.VarChar(20) |
| `invoiceNotes` | `String?` | @map("invoice_notes") @db.Text |
| `termsConditions` | `String?` | @map("terms_conditions") @db.Text |
| `documents` | `CompanyDocument[]` | - |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |

#### Model `CompanyDocument` (Table: `company_documents`)
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `id` | `String` | @id @default(uuid()) @db.Uuid |
| `companyProfileId` | `String` | @map("company_profile_id") @db.Uuid |
| `title` | `String` | @db.VarChar(255) |
| `fileUrl` | `String` | @map("file_url") @db.VarChar(500) |
| `fileKey` | `String` | @map("file_key") @db.VarChar(255) |
| `fileName` | `String` | @map("file_name") @db.VarChar(255) |
| `fileSize` | `Int` | @map("file_size") |
| `mimeType` | `String` | @map("mime_type") @db.VarChar(100) |
| `createdAt` | `DateTime` | @default(now()) @map("created_at") |
| `updatedAt` | `DateTime` | @updatedAt @map("updated_at") |
| `companyProfile` | `CompanyProfile` | @relation(fields: [companyProfileId], references: [id], onDelete: Cascade) |
**Constraints / Indexes:**
- `@@index([companyProfileId])`

### 2.3 Prisma Migrations History
- `backend/src/prisma/migrations/20261001000000_init`: Initial comprehensive schema setup.
- `backend/src/prisma/migrations/20261003183000_add_discount_code`: Adds discount code column.
- `backend/src/prisma/migrations/20261007224000_add_order_tracking`: Adds order tracking URL & number.
- `backend/src/prisma/migrations/20261020113000_add_email_template_wording`: Adds email template wording columns.
- `backend/src/prisma/migrations/20261027223000_add_shipping_module`: Adds shipping template and order shipping fields.
- Note: Legacy directory `backend/prisma/migrations` also exists with 3 older migrations (`20260820213955_init`, `20260905071855`, `20260927070918`).

---

## 3. BACKEND API INVENTORY (128 ENDPOINTS)

| # | Method | Path | Controller | Access / Guard | DTOs / Params |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/admin/accounting/summary` | `accounting.controller.ts` | `ROLES.READ_ONLY` | None |
| 2 | `GET` | `/admin/accounting/daily-breakdown` | `accounting.controller.ts` | `ROLES.READ_ONLY` | None |
| 3 | `GET` | `/admin/accounting/orders` | `accounting.controller.ts` | `ROLES.READ_ONLY` | None |
| 4 | `GET` | `/admin/accounting/export-csv` | `accounting.controller.ts` | `ROLES.READ_ONLY` | None |
| 5 | `GET` | `/addresses/me` | `addresses.controller.ts` | `ROLES.CUSTOMER` | None |
| 6 | `POST` | `/addresses/me` | `addresses.controller.ts` | `ROLES.CUSTOMER` | None |
| 7 | `PATCH` | `/addresses/me/:id` | `addresses.controller.ts` | `ROLES.CUSTOMER` | None |
| 8 | `DELETE` | `/addresses/me/:id` | `addresses.controller.ts` | `ROLES.CUSTOMER` | None |
| 9 | `PATCH` | `/addresses/me/:id/default` | `addresses.controller.ts` | `ROLES.CUSTOMER` | None |
| 10 | `GET` | `/admin/analytics/overview` | `analytics.controller.ts` | `ROLES.READ_ONLY` | None |
| 11 | `GET` | `/admin/analytics/top-products` | `analytics.controller.ts` | `ROLES.READ_ONLY` | None |
| 12 | `GET` | `/admin/analytics/top-categories` | `analytics.controller.ts` | `ROLES.READ_ONLY` | None |
| 13 | `GET` | `/admin/analytics/coupons` | `analytics.controller.ts` | `ROLES.READ_ONLY` | None |
| 14 | `GET` | `/admin/analytics/operational` | `analytics.controller.ts` | `ROLES.READ_ONLY` | None |
| 15 | `GET` | `/` | `app.controller.ts` | `@Public()` | None |
| 16 | `GET` | `/health` | `app.controller.ts` | `DEFAULT (Authenticated)` | None |
| 17 | `GET` | `/audit-logs` | `audit-logs.controller.ts` | `ROLES.ADMIN` | None |
| 18 | `POST` | `/test-mutations/products` | `sample-mutations.controller.ts` | `ROLES.EDITOR` | None |
| 19 | `PUT` | `/test-mutations/products/:id/price` | `sample-mutations.controller.ts` | `ROLES.EDITOR` | None |
| 20 | `DELETE` | `/test-mutations/products/:id` | `sample-mutations.controller.ts` | `ROLES.ADMIN` | None |
| 21 | `PATCH` | `/test-mutations/orders/:id/status` | `sample-mutations.controller.ts` | `ROLES.READ_ONLY` | None |
| 22 | `POST` | `/test-mutations/orders/:id/refund` | `sample-mutations.controller.ts` | `ROLES.EDITOR` | None |
| 23 | `POST` | `/test-mutations/discounts` | `sample-mutations.controller.ts` | `ROLES.EDITOR` | None |
| 24 | `PUT` | `/test-mutations/discounts/:id` | `sample-mutations.controller.ts` | `ROLES.EDITOR` | None |
| 25 | `DELETE` | `/test-mutations/discounts/:id` | `sample-mutations.controller.ts` | `ROLES.EDITOR` | None |
| 26 | `PATCH` | `/test-mutations/users/:id/role` | `sample-mutations.controller.ts` | `ROLES.ADMIN` | None |
| 27 | `PATCH` | `/test-mutations/inventory/:productId` | `sample-mutations.controller.ts` | `ROLES.EDITOR` | None |
| 28 | `POST` | `/auth/register` | `auth.controller.ts` | `DEFAULT (Authenticated)` | None |
| 29 | `POST` | `/auth/login` | `auth.controller.ts` | `DEFAULT (Authenticated)` | None |
| 30 | `POST` | `/auth/refresh` | `auth.controller.ts` | `@Public()` | None |
| 31 | `PATCH` | `/auth/change-password` | `auth.controller.ts` | `ROLES.CUSTOMER` | None |
| 32 | `GET` | `/auth/adminPanel` | `auth.controller.ts` | `ROLES.READ_ONLY` | None |
| 33 | `POST` | `/cart` | `cart.controller.ts` | `@Public()` | None |
| 34 | `GET` | `/cart/:id` | `cart.controller.ts` | `@Public()` | None |
| 35 | `POST` | `/cart/:id/items` | `cart.controller.ts` | `@Public()` | None |
| 36 | `PATCH` | `/cart/:id/items/:itemId` | `cart.controller.ts` | `@Public()` | None |
| 37 | `DELETE` | `/cart/:id/items/:itemId` | `cart.controller.ts` | `@Public()` | None |
| 38 | `POST` | `/admin/create-categories` | `categories.controller.ts` | `ROLES.EDITOR` | None |
| 39 | `GET` | `/categories` | `categories.controller.ts` | `@Public()` | None |
| 40 | `GET` | `/admin/all-categories` | `categories.controller.ts` | `ROLES.READ_ONLY` | None |
| 41 | `GET` | `/categories/:id` | `categories.controller.ts` | `@Public()` | None |
| 42 | `GET` | `/admin/categories/:id` | `categories.controller.ts` | `ROLES.READ_ONLY` | None |
| 43 | `PATCH` | `/admin/update-categories/:id` | `categories.controller.ts` | `ROLES.EDITOR` | None |
| 44 | `DELETE` | `/admin/delete-categories/:id` | `categories.controller.ts` | `ROLES.EDITOR` | None |
| 45 | `POST` | `/[clubbing-rules, clubbing]/upload-banner` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 46 | `POST` | `/[clubbing-rules, clubbing]` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 47 | `GET` | `/[clubbing-rules, clubbing]` | `clubbing.controller.ts` | `@Public()` | None |
| 48 | `GET` | `/[clubbing-rules, clubbing]/active` | `clubbing.controller.ts` | `@Public()` | None |
| 49 | `GET` | `/[clubbing-rules, clubbing]/:id` | `clubbing.controller.ts` | `@Public()` | None |
| 50 | `PATCH` | `/[clubbing-rules, clubbing]/:id` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 51 | `PATCH` | `/[clubbing-rules, clubbing]/:id/toggle` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 52 | `POST` | `/[clubbing-rules, clubbing]/:id/toggle` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 53 | `DELETE` | `/[clubbing-rules, clubbing]/:id` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 54 | `POST` | `/[clubbing-rules, clubbing]/bulk-delete` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 55 | `POST` | `/[clubbing-rules, clubbing]/bulk-status` | `clubbing.controller.ts` | `ROLES.EDITOR` | None |
| 56 | `POST` | `/[clubbing-rules, clubbing]/calculate` | `clubbing.controller.ts` | `@Public()` | None |
| 57 | `GET` | `/company-profile/public` | `company-profile.controller.ts` | `@Public()` | None |
| 58 | `GET` | `/admin/company-profile` | `company-profile.controller.ts` | `'admin'` | None |
| 59 | `PATCH` | `/admin/company-profile` | `company-profile.controller.ts` | `'admin'` | None |
| 60 | `GET` | `/admin/company-profile/documents` | `company-profile.controller.ts` | `'admin'` | None |
| 61 | `POST` | `/admin/company-profile/documents/upload` | `company-profile.controller.ts` | `'admin'` | None |
| 62 | `DELETE` | `/admin/company-profile/documents/:id` | `company-profile.controller.ts` | `'admin'` | None |
| 63 | `GET` | `/admin/customers` | `customers.controller.ts` | `ROLES.ADMIN` | None |
| 64 | `GET` | `/admin/customers/:phoneKey` | `customers.controller.ts` | `ROLES.ADMIN` | None |
| 65 | `GET` | `/admin/email/logs` | `admin-email-logs.controller.ts` | `ROLES.ADMIN` | None |
| 66 | `GET` | `/admin/email/stats` | `admin-email-logs.controller.ts` | `ROLES.ADMIN` | None |
| 67 | `POST` | `/admin/email/logs/:id/retry` | `admin-email-logs.controller.ts` | `ROLES.ADMIN` | None |
| 68 | `GET` | `/admin/email/templates` | `admin-email-templates.controller.ts` | `ROLES.ADMIN` | None |
| 69 | `PATCH` | `/admin/email/templates/:key` | `admin-email-templates.controller.ts` | `ROLES.ADMIN` | None |
| 70 | `POST` | `/admin/email/templates/:key/preview` | `admin-email-templates.controller.ts` | `ROLES.ADMIN` | None |
| 71 | `GET` | `/orders` | `customer-orders.controller.ts` | `@Public()` | None |
| 72 | `GET` | `/orders/:id/invoice` | `customer-orders.controller.ts` | `@Public()` | None |
| 73 | `GET` | `/orders/:id/shipping-label` | `customer-orders.controller.ts` | `@Public()` | None |
| 74 | `POST` | `/orders` | `customer-orders.controller.ts` | `@Public()` | None |
| 75 | `POST` | `/orders/track` | `customer-orders.controller.ts` | `@Public()` | None |
| 76 | `GET` | `/orders/track` | `customer-orders.controller.ts` | `@Public()` | None |
| 77 | `GET` | `/orders/me` | `customer-orders.controller.ts` | `ROLES.CUSTOMER` | None |
| 78 | `GET` | `/orders/me/by-number/:orderNumber` | `customer-orders.controller.ts` | `ROLES.CUSTOMER` | None |
| 79 | `GET` | `/orders/me/:id` | `customer-orders.controller.ts` | `ROLES.CUSTOMER` | None |
| 80 | `GET` | `/orders/:id` | `customer-orders.controller.ts` | `@Public()` | None |
| 81 | `GET` | `/admin/orders` | `orders.controller.ts` | `ROLES.READ_ONLY` | None |
| 82 | `GET` | `/admin/orders/:id` | `orders.controller.ts` | `ROLES.READ_ONLY` | None |
| 83 | `PATCH` | `/admin/orders/:id/status` | `orders.controller.ts` | `ROLES.READ_ONLY` | None |
| 84 | `GET` | `/admin/orders/:id/invoice` | `orders.controller.ts` | `@Public()` | None |
| 85 | `GET` | `/admin/orders/:id/shipping-label` | `orders.controller.ts` | `@Public()` | None |
| 86 | `POST` | `/admin/orders/webhook/refund` | `orders.controller.ts` | `@Public()` | None |
| 87 | `POST` | `/payments/create-session` | `payments.controller.ts` | `@Public()` | None |
| 88 | `POST` | `/payments/verify` | `payments.controller.ts` | `@Public()` | None |
| 89 | `POST` | `/payments/webhook` | `payments.controller.ts` | `@Public()` | None |
| 90 | `GET` | `/admin/payments` | `payments.controller.ts` | `ROLES.READ_ONLY` | None |
| 91 | `GET` | `/admin/payments/order/:orderId` | `payments.controller.ts` | `ROLES.READ_ONLY` | None |
| 92 | `POST` | `/pricing/calculate` | `pricing.controller.ts` | `@Public()` | None |
| 93 | `POST` | `/admin/products/upload-image` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 94 | `DELETE` | `/admin/products/delete-image` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 95 | `GET` | `/admin/products/export-csv` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 96 | `POST` | `/admin/products/import-csv` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 97 | `GET` | `/admin/products/next-sku` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 98 | `POST` | `/admin/create-products` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 99 | `POST` | `/admin/products` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 100 | `POST` | `/products` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 101 | `GET` | `/all-products` | `products.controller.ts` | `DEFAULT (Authenticated)` | None |
| 102 | `GET` | `/products` | `products.controller.ts` | `DEFAULT (Authenticated)` | None |
| 103 | `GET` | `/products/:id` | `products.controller.ts` | `DEFAULT (Authenticated)` | None |
| 104 | `GET` | `/admin/products/:id` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 105 | `PATCH` | `/admin/update-products/:id` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 106 | `PATCH` | `/products/:id` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 107 | `DELETE` | `/admin/delete-products/:id` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 108 | `DELETE` | `/products/:id` | `products.controller.ts` | `ROLES.EDITOR` | None |
| 109 | `POST` | `/reviews` | `reviews.controller.ts` | `@Public()` | None |
| 110 | `GET` | `/reviews/top` | `reviews.controller.ts` | `@Public()` | None |
| 111 | `GET` | `/reviews/products-summary` | `reviews.controller.ts` | `ROLES.EDITOR` | None |
| 112 | `GET` | `/reviews` | `reviews.controller.ts` | `@Public()` | None |
| 113 | `DELETE` | `/reviews/:id` | `reviews.controller.ts` | `ROLES.EDITOR` | None |
| 114 | `GET` | `/shipping-templates` | `shipping.controller.ts` | `ROLES.READ_ONLY` | None |
| 115 | `GET` | `/shipping-templates/public` | `shipping.controller.ts` | `@Public()` | None |
| 116 | `GET` | `/shipping-templates/default` | `shipping.controller.ts` | `@Public()` | None |
| 117 | `GET` | `/shipping-templates/:id` | `shipping.controller.ts` | `ROLES.READ_ONLY` | None |
| 118 | `POST` | `/shipping-templates` | `shipping.controller.ts` | `ROLES.EDITOR` | None |
| 119 | `PATCH` | `/shipping-templates/:id` | `shipping.controller.ts` | `ROLES.EDITOR` | None |
| 120 | `PATCH` | `/shipping-templates/:id/set-default` | `shipping.controller.ts` | `ROLES.EDITOR` | None |
| 121 | `DELETE` | `/shipping-templates/:id` | `shipping.controller.ts` | `ROLES.EDITOR` | None |
| 122 | `GET` | `/user/profile` | `user.controller.ts` | `DEFAULT (Authenticated)` | None |
| 123 | `GET` | `/admin/users` | `admin-users.controller.ts` | `ADMIN` | None |
| 124 | `POST` | `/admin/users` | `admin-users.controller.ts` | `ADMIN` | None |
| 125 | `PATCH` | `/admin/users/:id/role` | `admin-users.controller.ts` | `ADMIN` | None |
| 126 | `PATCH` | `/admin/users/:id/password` | `admin-users.controller.ts` | `ADMIN` | None |
| 127 | `GET` | `/users/me` | `users.controller.ts` | `ROLES.CUSTOMER` | None |
| 128 | `PATCH` | `/users/me` | `users.controller.ts` | `ROLES.CUSTOMER` | None |

---

## 4. FRONTEND PAGES & ROUTES INVENTORY

### 4.1 Customer Storefront Pages (31 Pages)
- `/about`
- `/account/addresses`
- `/account/orders`
- `/account/orders/[id]`
- `/account`
- `/account/profile`
- `/admin/accounting`
- `/admin/clubbings/new`
- `/admin/clubbings`
- `/admin/clubbings/[id]/edit`
- `/admin`
- `/cart`
- `/categories/[slug]`
- `/checkout`
- `/clubbing`
- `/contact`
- `/festive`
- `/login`
- `/order-confirmation`
- `/`
- `/privacy-policy`
- `/products`
- `/products/[slug]`
- `/refund-policy`
- `/register`
- `/shipping-policy`
- `/staff/clubbings/new`
- `/staff/clubbings`
- `/staff/clubbings/[id]/edit`
- `/terms-conditions`
- `/track-order`

### 4.2 Staff Admin Portal Pages (26 Pages)
- `/accounting`
- `/audit-logs`
- `/categories`
- `/clubbings/new`
- `/clubbings`
- `/clubbings/[id]/edit`
- `/company-profile`
- `/customers`
- `/customers/[phoneKey]`
- `/discounts/new`
- `/discounts`
- `/discounts/[id]/edit`
- `/email`
- `/invoices-labels`
- `/orders`
- `/orders/[id]`
- `/overview`
- `/payments`
- `/products/new`
- `/products`
- `/products/[id]/edit`
- `/reviews`
- `/shipping`
- `/users`
- `/login`
- `/`

---

## 5. ROLES & PERMISSIONS ARCHITECTURE

### 5.1 Defined Roles & Hierarchy
- **`admin`** (Rank 3): Super-administrator with unrestricted access to all endpoints, configurations, users, and audit logs.
- **`editor`** (Rank 2): Staff editor permitted to manage catalog, categories, products, orders, clubbings, discounts, and reviews. Denied access to staff user management, accounting, company profile, and audit logs.
- **`read_only`** / **`employee`** (Rank 1): Staff viewer with read-only view of orders and payments. Denied mutation capabilities.
- **`customer`** (Rank 0): End-user shopper. Permitted customer account endpoints (`/account/*`, cart, orders placement, own profile). Blocked from staff endpoints and admin portal.

### 5.2 Backend Protection Model
- **Fail-Closed Default**: Global guards `ThrottlerGuard`, `JwtAuthGuard`, and `RolesGuard` are registered at the application level in `AppModule`.
- Any endpoint without `@Public()` strictly requires a valid JWT Bearer token.
- Any endpoint without `@Public()` AND without `@Roles(...)` fails closed with `403 Forbidden` (enforced in `RolesGuard`).

### 5.3 Frontend Route Protection Model
- Storefront: `middleware.js` intercepts `/admin` and redirects to `http://localhost:3001`. Customer profile pages (`/account/*`) check `useAuth()` and redirect unauthenticated users to `/login`.
- Admin Portal: `DashboardLayout` (`admin-portal/app/(dashboard)/layout.jsx`) inspects `useAuth()`. Unauthenticated users or users with role `customer` are immediately redirected to `/login`. Role route access is checked against `ROLE_ALLOWED_ROUTE_PREFIXES`.

---

## 6. THIRD-PARTY INTEGRATIONS

1. **Razorpay Payments**:
   - Order creation via Razorpay Orders API (`POST /orders/checkout` $\rightarrow$ `razorpay.orders.create`).
   - Signature verification using HMAC SHA-256 (`POST /payments/verify`).
   - Webhook processing (`POST /payments/webhook`) handling `payment.captured`, `payment.failed`, `refund.processed`.
2. **Cloudflare R2 Object Storage (AWS S3 SDK Client)**:
   - S3-compatible file storage for product media, banner images, and legal company documents.
   - Files uploaded to bucket `sridattam-product-media` and served through public CDN URL.
3. **BullMQ & Redis**:
   - Asynchronous queue `email-notifications` offloading email dispatches.
   - Redis cache layer for cart sessions, product pricing, and rate throttling.
4. **Nodemailer / SMTP / Console**:
   - Dynamic provider selection based on `EMAIL_PROVIDER` (`smtp` vs `console`).
   - HTML templating engine for order confirmation, shipping updates, cancellation, and refund notices.
5. **Sentry Error Tracking**:
   - Sentry instrumentation initialized in `instrument.ts` and `SentryGlobalFilter` registered in `AppModule`.

---

## 7. DOCUMENTATION VS IMPLEMENTATION (BASELINE GAPS)

Based on comparison between `README.md`, `FINAL_REVIEW.md`, `ADMIN_PAYMENTS_AUDIT.md`, and actual source code:
1. **Shipping Route Access in Admin Portal**:
   - `ROLE_NAV_ITEMS.editor` displays `Shipping` (`/shipping`), but `ROLE_ALLOWED_ROUTE_PREFIXES.editor` omits `/shipping`, triggering an automatic redirect loop/kickback to `/overview` for editor staff.
2. **Storefront Residual Admin/Staff Routes**:
   - Storefront contains `/admin/accounting`, `/admin/clubbings`, and `/staff/clubbings`. The middleware only checks exact matches for `/admin` and `/admin/overview`, allowing residual admin routes to load in the storefront.
3. **Dual Prisma Migrations Folders**:
   - `backend/prisma/migrations` contains 3 migrations with `generator.client` target, while `backend/src/prisma/migrations` contains 5 migrations. In `backend/package.json`, schema path is explicitly `./src/prisma/schema.prisma`.
4. **Razorpay Signature Exposure in Admin Listing**:
   - `GET /admin/payments` returns payment entity data. Need to verify if cryptographic `razorpaySignature` is sanitized or leaked in API responses.
5. **Product Draft Leak via Query Parameter**:
   - `GET /products` with `?admin=true`. Need to verify whether unauthenticated users can access draft and archived items without authentication.
