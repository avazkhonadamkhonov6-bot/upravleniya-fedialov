-- Боти Telegram барои мизоҷон: қарз ва ҳолати фармоишҳо
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "telegramChatId" TEXT;

-- CreateIndex
CREATE INDEX "Client_telegramChatId_idx" ON "Client"("telegramChatId");

-- CreateIndex
CREATE INDEX "Customer_telegramChatId_idx" ON "Customer"("telegramChatId");

