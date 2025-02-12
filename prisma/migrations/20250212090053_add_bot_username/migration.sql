/*
  Warnings:

  - Added the required column `botUsername` to the `TelegramSettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TelegramSettings" ADD COLUMN     "botUsername" TEXT NOT NULL;
