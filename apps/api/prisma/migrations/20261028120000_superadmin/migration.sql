-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');

-- AlterTable: бизнесҳои мавҷуда аллакай кор мекунанд — тасдиқшуда ҳисоб мешаванд
ALTER TABLE "Organization" ADD COLUMN     "status" "OrgStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "statusNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" INTEGER,
ADD COLUMN     "isPlatform" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
