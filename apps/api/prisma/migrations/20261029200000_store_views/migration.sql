-- CreateTable: шумораи кушодани саҳифаи мағоза рӯз ба рӯз
CREATE TABLE "StoreView" (
    "organizationId" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoreView_pkey" PRIMARY KEY ("organizationId","day")
);

-- AddForeignKey
ALTER TABLE "StoreView" ADD CONSTRAINT "StoreView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
