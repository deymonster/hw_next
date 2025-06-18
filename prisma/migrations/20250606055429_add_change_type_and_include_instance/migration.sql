-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('LABEL_CHANGE', 'VALUE_CHANGE', 'THRESHOLD');

-- AlterTable
ALTER TABLE "AlertRule" ADD COLUMN     "changeType" "ChangeType",
ADD COLUMN     "includeInstance" BOOLEAN NOT NULL DEFAULT false;
