-- Анбор барои ҳар филиал
-- CreateTable
CREATE TABLE "BranchStock" (
    "productId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "BranchStock_pkey" PRIMARY KEY ("productId","branchId")
);

-- CreateIndex
CREATE INDEX "BranchStock_branchId_idx" ON "BranchStock"("branchId");

-- AddForeignKey
ALTER TABLE "BranchStock" ADD CONSTRAINT "BranchStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchStock" ADD CONSTRAINT "BranchStock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Боқимондаи ҳозира (як рақам барои тамоми ширкат) ба филиали аввали фаъол мегузарад
INSERT INTO "BranchStock" ("productId", "branchId", "qty")
SELECT p."id", b."id", p."stock"
FROM "Product" p
JOIN LATERAL (
  SELECT "id" FROM "Branch"
  WHERE "organizationId" = p."organizationId"
  ORDER BY "isActive" DESC, "id" ASC
  LIMIT 1
) b ON TRUE
WHERE p."stock" IS NOT NULL;
