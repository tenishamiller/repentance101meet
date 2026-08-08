-- CreateEnum
CREATE TYPE "MembershipMessageType" AS ENUM ('TEXT', 'ONBOARDING_INVITE', 'SYSTEM');

-- AlterEnum
ALTER TYPE "MemberActivityType" ADD VALUE 'QUESTIONNAIRE_COMPLETED';
ALTER TYPE "MemberActivityType" ADD VALUE 'ONBOARDING_INVITE_SENT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "questionnaireCompletedAt" TIMESTAMP(3),
ADD COLUMN "questionnaireAnswers" JSONB,
ADD COLUMN "onboardingDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "isOnboardingApproval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MembershipMessage" (
    "id" TEXT NOT NULL,
    "threadUserId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MembershipMessageType" NOT NULL DEFAULT 'TEXT',
    "meetingId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipMessage_threadUserId_createdAt_idx" ON "MembershipMessage"("threadUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipMessage" ADD CONSTRAINT "MembershipMessage_threadUserId_fkey" FOREIGN KEY ("threadUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipMessage" ADD CONSTRAINT "MembershipMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipMessage" ADD CONSTRAINT "MembershipMessage_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
