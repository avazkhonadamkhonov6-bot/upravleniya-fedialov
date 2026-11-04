-- Возврат: чеки манфӣ, ки ба фурӯши аслӣ ишора мекунад
ALTER TABLE "Order" ADD COLUMN "returnOfId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "note" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Order_returnOfId_idx" ON "Order"("returnOfId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_returnOfId_fkey" FOREIGN KEY ("returnOfId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
