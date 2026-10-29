-- AlterTable: акси мол ва боқимонда дар анбор
ALTER TABLE "Product" ADD COLUMN     "imageId" INTEGER,
ADD COLUMN     "stock" DECIMAL(12,3),
ADD COLUMN     "lowStock" DECIMAL(12,3);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
