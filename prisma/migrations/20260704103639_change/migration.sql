-- AlterTable
ALTER TABLE "lessons" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "school_id" DROP NOT NULL;
