-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN "variation_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_variation_id_key" ON "cart_items"("cart_id", "product_id", "variation_id") NULLS NOT DISTINCT;
