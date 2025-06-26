/*
  Warnings:

  - The values [PERFORMANCE,HEALTH,CUSTOM] on the enum `AlertCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AlertCategory_new" AS ENUM ('HARDWARE_CHANGE', 'CPU_MONITORING', 'DISK_MONITORING', 'NETWORK_MONITORING');
ALTER TABLE "AlertRule" ALTER COLUMN "category" TYPE "AlertCategory_new" USING ("category"::text::"AlertCategory_new");
ALTER TYPE "AlertCategory" RENAME TO "AlertCategory_old";
ALTER TYPE "AlertCategory_new" RENAME TO "AlertCategory";
DROP TYPE "AlertCategory_old";
COMMIT;
