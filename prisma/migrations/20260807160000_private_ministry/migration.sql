-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "MeetingKind" AS ENUM ('LIVESTREAM', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "kind" "MeetingKind" NOT NULL DEFAULT 'LIVESTREAM';
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "invitedUserId" TEXT;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
