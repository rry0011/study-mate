ALTER TABLE "submissions"
ADD COLUMN "feedback" TEXT;

CREATE TABLE "submission_attachments" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "relative_path" TEXT,
  "file_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submission_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "submission_attachments_submission_id_idx"
ON "submission_attachments"("submission_id");

ALTER TABLE "submission_attachments"
ADD CONSTRAINT "submission_attachments_submission_id_fkey"
FOREIGN KEY ("submission_id") REFERENCES "submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
