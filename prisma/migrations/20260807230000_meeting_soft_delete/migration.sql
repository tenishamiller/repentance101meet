ALTER TABLE "Meeting" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAt" TIMESTAMP(3);

CREATE INDEX "Meeting_purgeAt_idx" ON "Meeting"("purgeAt");
