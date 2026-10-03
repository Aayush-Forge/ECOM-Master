-- AlterTable
ALTER TABLE "clubbing_rules" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clubbing_rules_code_key" ON "clubbing_rules"("code");
