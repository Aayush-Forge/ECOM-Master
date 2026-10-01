-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ProductType" AS ENUM ('simple', 'variable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_type" "ProductType" NOT NULL DEFAULT 'simple';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "attributes" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "variations" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_id" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "attributes_snapshot" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_products_variations_gin" ON "products" USING GIN ("variations" jsonb_path_ops);
