-- Таъминкунандагон ва қарзи мо ба онҳо
-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "debt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEntry" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment" "Payment",
    "note" TEXT NOT NULL DEFAULT '',
    "stockMoveId" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_organizationId_name_key" ON "Supplier"("organizationId", "name");

-- CreateIndex
CREATE INDEX "SupplierEntry_supplierId_createdAt_idx" ON "SupplierEntry"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierEntry_organizationId_createdAt_idx" ON "SupplierEntry"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEntry" ADD CONSTRAINT "SupplierEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEntry" ADD CONSTRAINT "SupplierEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEntry" ADD CONSTRAINT "SupplierEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Таъминкунандагоне, ки аллакай дар «Қабули мол» навишта шуда буданд
INSERT INTO "Supplier" ("organizationId", "name")
SELECT DISTINCT "organizationId", TRIM("supplier") FROM "StockMove" WHERE TRIM("supplier") <> ''
ON CONFLICT ("organizationId", "name") DO NOTHING;
