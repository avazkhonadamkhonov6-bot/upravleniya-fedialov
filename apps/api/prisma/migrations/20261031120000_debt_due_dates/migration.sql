-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "debtDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DebtEntry" ADD COLUMN     "dueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DebtRequest" ADD COLUMN     "dueAt" TIMESTAMP(3);

