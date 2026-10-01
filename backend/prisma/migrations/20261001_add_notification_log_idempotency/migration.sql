-- AlterTable
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "error" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_log_order_id_template_key_recipient_key" ON "notification_log"("order_id", "template_key", "recipient");
