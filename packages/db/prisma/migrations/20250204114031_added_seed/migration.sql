/*
  Warnings:

  - Added the required column `seedPrase` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "seedPrase" TEXT NOT NULL;
