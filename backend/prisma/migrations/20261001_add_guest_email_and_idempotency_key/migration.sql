-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- AlterTable
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

-- Backfill existing notification_log rows if any
UPDATE "notification_log"
SET "idempotency_key" = COALESCE("idempotency_key", 'migrated:' || "id"::text)
WHERE "idempotency_key" IS NULL;

ALTER TABLE "notification_log" ALTER COLUMN "idempotency_key" SET NOT NULL;

-- Drop old index
DROP INDEX IF EXISTS "notification_log_order_id_template_key_recipient_key";

-- Create unique index on idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS "notification_log_idempotency_key_key" ON "notification_log"("idempotency_key");
