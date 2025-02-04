/*
  Warnings:

  - Added the required column `balance` to the `Secrets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Secrets" ADD COLUMN     "balance" TEXT NOT NULL;
