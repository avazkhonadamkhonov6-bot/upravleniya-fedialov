-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "attendanceCode" TEXT,
ADD COLUMN     "requireQrCheckIn" BOOLEAN NOT NULL DEFAULT false;

