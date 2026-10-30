-- POS-и офлайн: рақами ягонаи фурӯш аз браузер
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientRef_key" ON "Order"("clientRef");

