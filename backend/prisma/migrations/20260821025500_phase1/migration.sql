/*
  Warnings:

  - You are about to drop the column `quantity` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Borrower` table. All the data in the column will be lost.
  - You are about to drop the column `bookId` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[isbn]` on the table `Book` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Borrower` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrCode]` on the table `Borrower` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `qrCode` to the `Borrower` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Borrower` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookCopyId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dueDate` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Borrower_email_key";

-- AlterTable
ALTER TABLE "Book" DROP COLUMN "quantity",
DROP COLUMN "status",
ADD COLUMN     "genre" TEXT;

-- AlterTable
ALTER TABLE "Borrower" DROP COLUMN "email",
ADD COLUMN     "qrCode" TEXT NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD COLUMN     "violationCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'active';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "bookId",
ADD COLUMN     "bookCopyId" INTEGER NOT NULL,
ADD COLUMN     "dueDate" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "BookCopy" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "qrCode" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'queued',

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookCopy_qrCode_key" ON "BookCopy"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_userId_key" ON "Borrower"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_qrCode_key" ON "Borrower"("qrCode");

-- AddForeignKey
ALTER TABLE "Borrower" ADD CONSTRAINT "Borrower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCopy" ADD CONSTRAINT "BookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "BookCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
