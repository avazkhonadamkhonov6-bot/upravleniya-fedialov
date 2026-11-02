-- Тарифҳо: FREE (1 филиал, 4 корманд) ва тарифҳои пулакӣ бо пардохт ба корт
ALTER TABLE "Organization" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Organization" ADD COLUMN "planUntil" TIMESTAMP(3);

CREATE TYPE "PlanPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "PlanPayment" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "plan" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "status" "PlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" INTEGER,
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlanPayment_status_idx" ON "PlanPayment"("status");
CREATE INDEX "PlanPayment_organizationId_idx" ON "PlanPayment"("organizationId");
ALTER TABLE "PlanPayment" ADD CONSTRAINT "PlanPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Бизнесҳое, ки пеш аз тарифҳо сабт шуда буданд, 30 рӯз тарифи «Бизнес»-ро ройгон мегиранд,
-- то ногаҳон ба маҳдудият дучор нашаванд ва вақт дошта бошанд тариф интихоб кунанд.
UPDATE "Organization" SET "plan" = 'BUSINESS', "planUntil" = NOW() + INTERVAL '30 days' WHERE "isPlatform" = false;
