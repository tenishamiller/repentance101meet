-- Per-user message thread trash (30-day restore) and thread generations.

CREATE TYPE "MessageThreadKind" AS ENUM ('MEMBERSHIP', 'MEMBER_DM');

ALTER TABLE "MembershipMessage" ADD COLUMN "threadSeq" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "MemberDirectMessage" ADD COLUMN "threadSeq" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "DeletedMessageThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MessageThreadKind" NOT NULL,
    "otherUserId" TEXT NOT NULL,
    "seqFrom" INTEGER NOT NULL,
    "seqTo" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgeAt" TIMESTAMP(3) NOT NULL,
    "permanentlyDeletedAt" TIMESTAMP(3),

    CONSTRAINT "DeletedMessageThread_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipMessage_threadUserId_threadSeq_createdAt_idx" ON "MembershipMessage"("threadUserId", "threadSeq", "createdAt");
CREATE INDEX "MemberDirectMessage_senderId_recipientId_threadSeq_idx" ON "MemberDirectMessage"("senderId", "recipientId", "threadSeq");
CREATE INDEX "DeletedMessageThread_userId_kind_otherUserId_idx" ON "DeletedMessageThread"("userId", "kind", "otherUserId");
CREATE INDEX "DeletedMessageThread_purgeAt_permanentlyDeletedAt_idx" ON "DeletedMessageThread"("purgeAt", "permanentlyDeletedAt");

ALTER TABLE "DeletedMessageThread" ADD CONSTRAINT "DeletedMessageThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeletedMessageThread" ADD CONSTRAINT "DeletedMessageThread_otherUserId_fkey" FOREIGN KEY ("otherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
