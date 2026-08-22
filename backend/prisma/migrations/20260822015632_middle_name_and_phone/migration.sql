/*
  Warnings:

  - You are about to drop the column `middleInit` on the `Borrower` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Borrower" DROP COLUMN "middleInit",
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "phone" TEXT;
