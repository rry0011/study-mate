ALTER TABLE "lessons" ALTER COLUMN "room_id" DROP NOT NULL;

ALTER TABLE "lessons"
  DROP CONSTRAINT IF EXISTS "lessons_room_id_fkey";

ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "courses"
  ADD COLUMN "evaluations_published_at" TIMESTAMP(3);

CREATE TABLE "course_evaluations" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "course_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_evaluations_course_id_student_id_key"
  ON "course_evaluations"("course_id", "student_id");
CREATE INDEX "course_evaluations_student_id_idx"
  ON "course_evaluations"("student_id");

ALTER TABLE "course_evaluations"
  ADD CONSTRAINT "course_evaluations_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_evaluations"
  ADD CONSTRAINT "course_evaluations_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
