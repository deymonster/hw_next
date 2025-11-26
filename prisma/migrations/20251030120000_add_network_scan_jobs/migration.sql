-- CreateEnum
CREATE TYPE "NetworkScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "NetworkScanJob" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NetworkScanStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "options" JSONB,
    "userId" TEXT,
    CONSTRAINT "NetworkScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetworkScanJob_status_idx" ON "NetworkScanJob"("status");
CREATE INDEX "NetworkScanJob_createdAt_idx" ON "NetworkScanJob"("createdAt");
CREATE INDEX "NetworkScanJob_userId_idx" ON "NetworkScanJob"("userId");

-- AddForeignKey
ALTER TABLE "NetworkScanJob" ADD CONSTRAINT "NetworkScanJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
