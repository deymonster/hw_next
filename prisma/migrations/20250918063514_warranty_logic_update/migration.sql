/*
  Warnings:

  - You are about to drop the column `warrantyStatus` on the `Device` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Device" DROP COLUMN "warrantyStatus",
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "warrantyPeriod" INTEGER;
