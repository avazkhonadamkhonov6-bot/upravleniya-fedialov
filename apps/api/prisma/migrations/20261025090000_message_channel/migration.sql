-- Ҳар паём ба як канал тааллуқ дорад, то чатҳои WhatsApp ва Telegram омехта нашаванд.
ALTER TABLE "Message" ADD COLUMN "channel" TEXT;

-- Паёмҳои кӯҳна: аз рӯи манбаъ ё ҳолати нусха
UPDATE "Message" SET "channel" = CASE
  WHEN "source" = 'TELEGRAM' THEN 'TELEGRAM'
  WHEN "source" = 'WHATSAPP' THEN 'WHATSAPP'
  WHEN "whatsappStatus" IS NOT NULL THEN 'WHATSAPP'
  WHEN "telegramStatus" IS NOT NULL THEN 'TELEGRAM'
  ELSE NULL
END;

CREATE INDEX "Message_channel_idx" ON "Message"("channel");
