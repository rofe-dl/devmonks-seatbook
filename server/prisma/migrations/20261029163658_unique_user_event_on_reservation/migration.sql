/*
  Warnings:

  - A unique constraint covering the columns `[userId,eventId]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Reservation_userId_key";

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "eventId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_userId_eventId_key" ON "Reservation"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
