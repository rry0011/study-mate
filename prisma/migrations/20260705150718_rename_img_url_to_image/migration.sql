/*
  Warnings:

  - You are about to drop the column `img_url` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "img_url",
ADD COLUMN     "image" TEXT;
