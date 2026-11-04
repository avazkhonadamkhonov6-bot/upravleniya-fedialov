-- Пас аз ивази парол токенҳои кӯҳна (дигар дастгоҳҳо) қабул намешаванд
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
