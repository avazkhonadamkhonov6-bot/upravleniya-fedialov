-- AlterTable: WhatsApp-и худи бизнес (Green-API)
ALTER TABLE "Organization" ADD COLUMN     "waInstanceId" TEXT,
ADD COLUMN     "waApiToken" TEXT,
ADD COLUMN     "waApiUrl" TEXT,
ADD COLUMN     "waMediaUrl" TEXT;
