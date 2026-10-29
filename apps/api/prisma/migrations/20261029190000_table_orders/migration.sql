-- AlterTable: фармоиш аз миз (QR) бе сабти ном
ALTER TABLE "OnlineOrder" ADD COLUMN     "table" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;
