-- Ширкатҳо (multi-tenant): ҳар соҳибкор ширкати худро дорад, маълумоташ аз дигарон ҷудо аст.
-- Маълумоти мавҷуда ба як ширкат («FilialHub», тарабхона) мегузарад.

ALTER TYPE "Position" ADD VALUE 'SELLER';
ALTER TYPE "Position" ADD VALUE 'STOREKEEPER';

CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RESTAURANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organization" ("name", "type")
SELECT 'FilialHub', 'RESTAURANT'
WHERE EXISTS (SELECT 1 FROM "User") OR EXISTS (SELECT 1 FROM "Branch") OR EXISTS (SELECT 1 FROM "Product");

-- Сутунҳо аввал холӣ, баъд пур, баъд NOT NULL
ALTER TABLE "Branch" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "User" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "Product" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "Customer" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "Task" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "Notification" ADD COLUMN "organizationId" INTEGER;

UPDATE "Branch" SET "organizationId" = (SELECT MIN("id") FROM "Organization");
UPDATE "User" SET "organizationId" = (SELECT MIN("id") FROM "Organization");
UPDATE "Product" SET "organizationId" = (SELECT MIN("id") FROM "Organization");
UPDATE "Customer" SET "organizationId" = (SELECT MIN("id") FROM "Organization");
UPDATE "Task" SET "organizationId" = (SELECT MIN("id") FROM "Organization");
UPDATE "AuditLog" SET "organizationId" = (SELECT MIN("id") FROM "Organization");
UPDATE "Notification" SET "organizationId" = (SELECT MIN("id") FROM "Organization");

ALTER TABLE "Branch" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "organizationId" SET NOT NULL;

-- Маҳсулот: воҳиди ченак (тарабхона — порция)
ALTER TABLE "Product" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'дона',
ALTER COLUMN "emoji" SET DEFAULT '📦';
UPDATE "Product" SET "unit" = 'порция';

-- Миқдор касрӣ ҳам мешавад (1,5 кг)
ALTER TABLE "OrderItem" ALTER COLUMN "qty" SET DATA TYPE DECIMAL(10,3);

-- Рақами мизоҷ танҳо дар дохили ширкат ягона аст
DROP INDEX "Customer_phone_key";
CREATE UNIQUE INDEX "Customer_organizationId_phone_key" ON "Customer"("organizationId", "phone");

CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "Branch_organizationId_idx" ON "Branch"("organizationId");
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
