-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "serialNumber" TEXT,
    "processor" TEXT,
    "motherboard" JSONB,
    "memory" JSONB,
    "storage" JSONB,
    "networkCards" JSONB,
    "videoCards" JSONB,
    "diskUsage" JSONB,
    "employeeId" TEXT,
    "departmentId" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inventory_userId_idx" ON "Inventory"("userId");

-- CreateIndex
CREATE INDEX "Inventory_startDate_idx" ON "Inventory"("startDate");

-- CreateIndex
CREATE INDEX "InventoryItem_deviceId_idx" ON "InventoryItem"("deviceId");

-- CreateIndex
CREATE INDEX "InventoryItem_inventoryId_idx" ON "InventoryItem"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_employeeId_idx" ON "InventoryItem"("employeeId");

-- CreateIndex
CREATE INDEX "InventoryItem_departmentId_idx" ON "InventoryItem"("departmentId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
