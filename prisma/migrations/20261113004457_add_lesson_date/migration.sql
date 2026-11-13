/*
  Warnings:

  - You are about to drop the column `day_of_week` on the `lessons` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[room_id,date,period]` on the table `lessons` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[school_id,period]` on the table `timetables` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "courses" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "day_of_week",
ADD COLUMN     "date" DATE;

-- CreateIndex
CREATE INDEX "lessons_course_id_date_idx" ON "lessons"("course_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_room_id_date_period_key" ON "lessons"("room_id", "date", "period");

-- CreateIndex
CREATE UNIQUE INDEX "timetables_school_id_period_key" ON "timetables"("school_id", "period");
