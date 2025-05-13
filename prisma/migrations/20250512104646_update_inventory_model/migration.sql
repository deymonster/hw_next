/*
  Warnings:

  - You are about to drop the column `deviceName` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `InventoryItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "deviceName",
DROP COLUMN "ipAddress",
DROP COLUMN "serialNumber";

-- CreateTable
CREATE TABLE "_DepartmentToInventory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentToInventory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DepartmentToInventory_B_index" ON "_DepartmentToInventory"("B");

-- AddForeignKey
ALTER TABLE "_DepartmentToInventory" ADD CONSTRAINT "_DepartmentToInventory_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToInventory" ADD CONSTRAINT "_DepartmentToInventory_B_fkey" FOREIGN KEY ("B") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
