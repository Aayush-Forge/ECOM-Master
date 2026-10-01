-- AlterTable
ALTER TABLE "clubbing_rules" ADD COLUMN IF NOT EXISTS "usage_limit" INTEGER;
ALTER TABLE "clubbing_rules" ADD COLUMN IF NOT EXISTS "usage_count" INTEGER NOT NULL DEFAULT 0;
