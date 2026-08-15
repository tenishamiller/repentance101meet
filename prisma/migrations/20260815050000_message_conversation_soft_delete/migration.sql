-- CreateEnum
CREATE TYPE "MessageConversationKind" AS ENUM ('ADMIN_MEMBER', 'MEMBER_DM');

-- CreateTable
CREATE TABLE "MessageConversation" (
    "id" TEXT NOT NULL,
    "kind" "MessageConversationKind" NOT NULL,
    "memberUserId" TEXT,
    "participantAId" TEXT,
    "participantBId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "purgeAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageConversation_kind_memberUserId_deletedAt_idx" ON "MessageConversation"("kind", "memberUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "MessageConversation_participantAId_participantBId_deletedAt_idx" ON "MessageConversation"("participantAId", "participantBId", "deletedAt");

-- CreateIndex
CREATE INDEX "MessageConversation_purgeAt_idx" ON "MessageConversation"("purgeAt");

-- AddForeignKey
ALTER TABLE "MessageConversation" ADD CONSTRAINT "MessageConversation_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageConversation" ADD CONSTRAINT "MessageConversation_participantAId_fkey" FOREIGN KEY ("participantAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageConversation" ADD CONSTRAINT "MessageConversation_participantBId_fkey" FOREIGN KEY ("participantBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageConversation" ADD CONSTRAINT "MessageConversation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add nullable conversation columns first for backfill
ALTER TABLE "MembershipMessage" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "MemberDirectMessage" ADD COLUMN "conversationId" TEXT;

-- Backfill ADMIN_MEMBER conversations (one active thread per member who has messages)
INSERT INTO "MessageConversation" ("id", "kind", "memberUserId", "createdAt", "updatedAt")
SELECT
  md5('admin-member:' || "threadUserId") AS "id",
  'ADMIN_MEMBER'::"MessageConversationKind",
  "threadUserId",
  MIN("createdAt"),
  MAX("updatedAt")
FROM "MembershipMessage"
GROUP BY "threadUserId";

UPDATE "MembershipMessage" m
SET "conversationId" = md5('admin-member:' || m."threadUserId");

-- Backfill MEMBER_DM conversations (one active thread per unordered pair)
INSERT INTO "MessageConversation" ("id", "kind", "participantAId", "participantBId", "createdAt", "updatedAt")
SELECT
  md5(
    'member-dm:' ||
    LEAST(d."senderId", d."recipientId") || ':' ||
    GREATEST(d."senderId", d."recipientId")
  ) AS "id",
  'MEMBER_DM'::"MessageConversationKind",
  LEAST(d."senderId", d."recipientId"),
  GREATEST(d."senderId", d."recipientId"),
  MIN(d."createdAt"),
  MAX(d."updatedAt")
FROM "MemberDirectMessage" d
GROUP BY LEAST(d."senderId", d."recipientId"), GREATEST(d."senderId", d."recipientId");

UPDATE "MemberDirectMessage" d
SET "conversationId" = md5(
  'member-dm:' ||
  LEAST(d."senderId", d."recipientId") || ':' ||
  GREATEST(d."senderId", d."recipientId")
);

-- Make conversationId required
ALTER TABLE "MembershipMessage" ALTER COLUMN "conversationId" SET NOT NULL;
ALTER TABLE "MemberDirectMessage" ALTER COLUMN "conversationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "MembershipMessage_conversationId_createdAt_idx" ON "MembershipMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MemberDirectMessage_conversationId_createdAt_idx" ON "MemberDirectMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipMessage" ADD CONSTRAINT "MembershipMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MessageConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberDirectMessage" ADD CONSTRAINT "MemberDirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MessageConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
