-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('simple', 'variable');

-- CreateEnum
CREATE TYPE "ClubbingRuleType" AS ENUM ('fixed_price_bundle', 'percentage_off_bundle');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('active', 'converted', 'abandoned');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('cart', 'payment_pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "OrderAddressType" AS ENUM ('billing', 'shipping');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentWebhookStatus" AS ENUM ('received', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'read_only', 'customer');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'failed');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "base_price" DECIMAL(65,30) NOT NULL,
    "compare_at_price" DECIMAL(65,30),
    "sale_price" DECIMAL(65,30),
    "weight" DECIMAL(65,30),
    "length" DECIMAL(65,30),
    "width" DECIMAL(65,30),
    "height" DECIMAL(65,30),
    "category_id" UUID NOT NULL,
    "status" "ProductStatus" NOT NULL,
    "images" TEXT[],
    "custom_fields" JSONB NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "product_type" "ProductType" NOT NULL DEFAULT 'simple',
    "attributes" JSONB,
    "variations" JSONB,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_keywords" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubbing_rules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ClubbingRuleType" NOT NULL,
    "required_quantity" INTEGER NOT NULL,
    "fixed_price" DECIMAL(10,2),
    "percentage_off" DECIMAL(5,2),
    "applicable_category_id" UUID,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubbing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubbing_rule_products" (
    "rule_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "clubbing_rule_products_pkey" PRIMARY KEY ("rule_id","product_id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "session_token" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variation_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price_snapshot" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_id" UUID,
    "status" "OrderStatus" NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "discount_total" DECIMAL(65,30) NOT NULL,
    "tax_total" DECIMAL(65,30) NOT NULL,
    "shipping_total" DECIMAL(65,30) NOT NULL,
    "grand_total" DECIMAL(65,30) NOT NULL,
    "coupon_code" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "placed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "sku_snapshot" TEXT NOT NULL,
    "unit_price_snapshot" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" DECIMAL(65,30) NOT NULL,
    "variant_id" TEXT,
    "attributes_snapshot" JSONB,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_id" UUID,
    "changed_by_system" TEXT,
    "note" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_addresses" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" "OrderAddressType" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "razorpay_order_id" TEXT NOT NULL,
    "razorpay_payment_id" TEXT,
    "razorpay_signature" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL,
    "razorpay_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "status" "PaymentWebhookStatus" NOT NULL,
    "paymentId" UUID,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "variables_schema" JSONB NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "order_id" UUID,
    "user_id" UUID,
    "recipient" TEXT,
    "template_key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NotificationStatus" NOT NULL,
    "error" TEXT,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "clubbing_rules_applicable_category_id_idx" ON "clubbing_rules"("applicable_category_id");

-- CreateIndex
CREATE INDEX "clubbing_rules_is_active_idx" ON "clubbing_rules"("is_active");

-- CreateIndex
CREATE INDEX "clubbing_rules_starts_at_idx" ON "clubbing_rules"("starts_at");

-- CreateIndex
CREATE INDEX "clubbing_rules_ends_at_idx" ON "clubbing_rules"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "carts_session_token_key" ON "carts"("session_token");

-- CreateIndex
CREATE INDEX "carts_customer_id_idx" ON "carts"("customer_id");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_variation_id_key" ON "cart_items"("cart_id", "product_id", "variation_id") NULLS NOT DISTINCT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE INDEX "order_status_history_to_status_idx" ON "order_status_history"("to_status");

-- CreateIndex
CREATE INDEX "order_addresses_order_id_idx" ON "order_addresses"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_razorpay_event_id_key" ON "payment_webhook_events"("razorpay_event_id");

-- CreateIndex
CREATE INDEX "payment_webhook_events_paymentId_idx" ON "payment_webhook_events"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_log_idempotency_key_key" ON "notification_log"("idempotency_key");

-- CreateIndex
CREATE INDEX "notification_log_order_id_idx" ON "notification_log"("order_id");

-- CreateIndex
CREATE INDEX "notification_log_user_id_idx" ON "notification_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubbing_rules" ADD CONSTRAINT "clubbing_rules_applicable_category_id_fkey" FOREIGN KEY ("applicable_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubbing_rule_products" ADD CONSTRAINT "clubbing_rule_products_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "clubbing_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubbing_rule_products" ADD CONSTRAINT "clubbing_rule_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
