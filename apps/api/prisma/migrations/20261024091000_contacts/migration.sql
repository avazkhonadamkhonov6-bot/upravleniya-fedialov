-- Ҳар корманд рақами WhatsApp ва номи Telegram-и худро дошта метавонад
ALTER TABLE "User" ADD COLUMN "whatsapp" TEXT NOT NULL DEFAULT '',
ADD COLUMN "telegram" TEXT NOT NULL DEFAULT '';
