-- CreateEnum
CREATE TYPE "ShippingRateType" AS ENUM ('weight', 'order_value');

-- CreateTable
CREATE TABLE "shipping_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "carrier_name" TEXT NOT NULL,
    "rate_type" "ShippingRateType" NOT NULL DEFAULT 'order_value',
    "slabs" JSONB NOT NULL,
    "free_shipping_threshold" DECIMAL(10,2),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_templates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "products" ADD COLUMN "shipping_template_id" UUID;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shipping_template_name" TEXT,
ADD COLUMN "shipping_carrier" TEXT,
ADD COLUMN "shipping_snapshot" JSONB;

-- CreateIndex
CREATE INDEX "products_shipping_template_id_idx" ON "products"("shipping_template_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shipping_template_id_fkey" FOREIGN KEY ("shipping_template_id") REFERENCES "shipping_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default shipping template: (₹49 below ₹499, free at or above)
INSERT INTO "shipping_templates" (
    "id",
    "name",
    "carrier_name",
    "rate_type",
    "slabs",
    "free_shipping_threshold",
    "is_default",
    "is_enabled",
    "created_at",
    "updated_at"
) VALUES (
    gen_random_uuid(),
    'Standard Delivery',
    'Standard Delivery',
    'order_value',
    '[{"upTo": 499, "charge": 49}, {"upTo": null, "charge": 0}]'::jsonb,
    499.00,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
