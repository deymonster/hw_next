-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activationKeyVer" INTEGER,
ADD COLUMN     "activationSig" TEXT;
