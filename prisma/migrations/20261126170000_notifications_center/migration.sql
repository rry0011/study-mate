ALTER TYPE "NotificationType" ADD VALUE 'LESSON';
ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE';
ALTER TYPE "NotificationType" ADD VALUE 'OVERDUE';

ALTER TABLE "notifications"
ADD COLUMN "title" TEXT NOT NULL DEFAULT 'お知らせ',
ADD COLUMN "href" TEXT,
ADD COLUMN "dedupe_key" TEXT,
ADD COLUMN "read_at" TIMESTAMP(3);

UPDATE "notifications"
SET "read_at" = "created_at"
WHERE "read" = TRUE;

DROP INDEX "notifications_user_id_read_idx";
CREATE INDEX "notifications_user_id_read_created_at_idx"
ON "notifications"("user_id", "read", "created_at");

CREATE UNIQUE INDEX "notifications_dedupe_key_key"
ON "notifications"("dedupe_key");
