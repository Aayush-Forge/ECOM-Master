-- Add SEO/meta fields to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meta_title" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meta_description" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "meta_keywords" TEXT;
