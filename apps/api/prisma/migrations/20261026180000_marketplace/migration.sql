-- CreateEnum
CREATE TYPE "OnlineOrderStatus" AS ENUM ('NEW', 'ACCEPTED', 'DELIVERING', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ownerId" INTEGER;

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineOrder" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "status" "OnlineOrderStatus" NOT NULL DEFAULT 'NEW',
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "total" DECIMAL(12,2) NOT NULL,
    "saleOrderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineOrderItem" (
    "id" SERIAL NOT NULL,
    "onlineOrderId" INTEGER NOT NULL,
    "productId" INTEGER,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "qty" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OnlineOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "OnlineOrder_organizationId_status_idx" ON "OnlineOrder"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OnlineOrder_clientId_createdAt_idx" ON "OnlineOrder"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "OnlineOrderItem_onlineOrderId_idx" ON "OnlineOrderItem"("onlineOrderId");

-- AddForeignKey
ALTER TABLE "OnlineOrder" ADD CONSTRAINT "OnlineOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineOrder" ADD CONSTRAINT "OnlineOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineOrder" ADD CONSTRAINT "OnlineOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineOrderItem" ADD CONSTRAINT "OnlineOrderItem_onlineOrderId_fkey" FOREIGN KEY ("onlineOrderId") REFERENCES "OnlineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineOrderItem" ADD CONSTRAINT "OnlineOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Бизнесҳои мавҷуда: соҳиб — шефи аввалини ширкат
UPDATE "Organization" o SET "ownerId" = (SELECT MIN(u.id) FROM "User" u WHERE u."organizationId" = o.id AND u.role = 'CHEF');
