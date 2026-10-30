-- CreateEnum
CREATE TYPE "DebtRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DebtRequest" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "sale" JSONB,
    "status" "DebtRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" INTEGER,
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebtRequest_organizationId_status_idx" ON "DebtRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DebtRequest_branchId_status_idx" ON "DebtRequest"("branchId", "status");

-- AddForeignKey
ALTER TABLE "DebtRequest" ADD CONSTRAINT "DebtRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRequest" ADD CONSTRAINT "DebtRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRequest" ADD CONSTRAINT "DebtRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRequest" ADD CONSTRAINT "DebtRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtRequest" ADD CONSTRAINT "DebtRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

