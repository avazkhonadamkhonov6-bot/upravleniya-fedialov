-- Паёмҳои дастӣ: кӣ фиристод
ALTER TABLE "Notification" ADD COLUMN "senderId" INTEGER;
CREATE INDEX "Notification_senderId_idx" ON "Notification"("senderId");
