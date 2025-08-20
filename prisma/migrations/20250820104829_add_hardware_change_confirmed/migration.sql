-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "hardwareChangeConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
