-- CreateTable (idempotent — table may exist from prior db push)
CREATE TABLE IF NOT EXISTS "MeetingSignal" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MeetingSignal_meetingId_createdAt_idx" ON "MeetingSignal"("meetingId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "MeetingSignal" ADD CONSTRAINT "MeetingSignal_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
