/*
  Warnings:

  - You are about to drop the column `addressType` on the `User` table. All the data in the column will be lost.
  - Added the required column `addressType` to the `Secrets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Secrets" ADD COLUMN     "addressType" "AddressType" NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "addressType";
