-- CreateEnum
CREATE TYPE "MemberActivityType" AS ENUM ('JOINED', 'MEMBERSHIP_APPROVED', 'MEMBERSHIP_DENIED', 'CHANNEL_REQUESTED', 'CHANNEL_APPROVED', 'CHANNEL_DENIED', 'CHANNEL_REMOVED', 'BLOCKED', 'UNBLOCKED', 'BLOCKED_MEETING', 'UNBLOCKED_MEETING');

-- CreateTable
CREATE TABLE "MemberActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MemberActivityType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT,
    "meetingId" TEXT,
    "reason" TEXT,
    "actorId" TEXT,
    "label" TEXT,

    CONSTRAINT "MemberActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberActivityLog_userId_occurredAt_idx" ON "MemberActivityLog"("userId", "occurredAt");

-- AddForeignKey
ALTER TABLE "MemberActivityLog" ADD CONSTRAINT "MemberActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberActivityLog" ADD CONSTRAINT "MemberActivityLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberActivityLog" ADD CONSTRAINT "MemberActivityLog_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberActivityLog" ADD CONSTRAINT "MemberActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
