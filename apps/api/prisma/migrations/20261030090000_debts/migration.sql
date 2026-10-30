-- Дафтари қарз: фурӯш ба қарз (Payment.DEBT), қарзи мизоҷ ва таърихи қарз/пардохт
-- AlterEnum
ALTER TYPE "Payment" ADD VALUE 'DEBT';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "debt" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "debtRemindedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DebtEntry" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment" "Payment",
    "note" TEXT NOT NULL DEFAULT '',
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebtEntry_orderId_key" ON "DebtEntry"("orderId");

-- CreateIndex
CREATE INDEX "DebtEntry_organizationId_createdAt_idx" ON "DebtEntry"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "DebtEntry_customerId_createdAt_idx" ON "DebtEntry"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "DebtEntry" ADD CONSTRAINT "DebtEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEntry" ADD CONSTRAINT "DebtEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEntry" ADD CONSTRAINT "DebtEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEntry" ADD CONSTRAINT "DebtEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

