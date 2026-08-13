-- AlterTable
ALTER TABLE "MeetingMessage" ADD COLUMN "replyToId" TEXT;

-- CreateIndex
CREATE INDEX "MeetingMessage_replyToId_idx" ON "MeetingMessage"("replyToId");

-- AddForeignKey
ALTER TABLE "MeetingMessage" ADD CONSTRAINT "MeetingMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "MeetingMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
