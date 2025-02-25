/*
  Warnings:

  - You are about to drop the column `uniqueId` on the `Device` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[agentKey]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ipAddress` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Device_uniqueId_idx";

-- DropIndex
DROP INDEX "Device_uniqueId_key";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "uniqueId",
ADD COLUMN     "agentKey" TEXT,
ADD COLUMN     "ipAddress" TEXT NOT NULL,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Device_agentKey_key" ON "Device"("agentKey");

-- CreateIndex
CREATE INDEX "Device_agentKey_idx" ON "Device"("agentKey");
