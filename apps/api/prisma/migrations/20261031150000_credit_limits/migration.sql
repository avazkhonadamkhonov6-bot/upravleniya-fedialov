-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "cashierDebtLimit" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "creditLimit" DECIMAL(12,2);

