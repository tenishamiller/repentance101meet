-- Member-to-member DMs: request/approve, block, and remove-without-block.

CREATE TYPE "MemberDmRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'REMOVED');

CREATE TABLE "MemberDmRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "MemberDmRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberDmRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberDmBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberDmBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberDirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "readAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberDirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberDmRequest_fromUserId_toUserId_key" ON "MemberDmRequest"("fromUserId", "toUserId");
CREATE INDEX "MemberDmRequest_toUserId_status_idx" ON "MemberDmRequest"("toUserId", "status");
CREATE UNIQUE INDEX "MemberDmBlock_blockerId_blockedId_key" ON "MemberDmBlock"("blockerId", "blockedId");
CREATE INDEX "MemberDirectMessage_senderId_recipientId_createdAt_idx" ON "MemberDirectMessage"("senderId", "recipientId", "createdAt");
CREATE INDEX "MemberDirectMessage_recipientId_readAt_idx" ON "MemberDirectMessage"("recipientId", "readAt");

ALTER TABLE "MemberDmRequest" ADD CONSTRAINT "MemberDmRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberDmRequest" ADD CONSTRAINT "MemberDmRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberDmBlock" ADD CONSTRAINT "MemberDmBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberDmBlock" ADD CONSTRAINT "MemberDmBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberDirectMessage" ADD CONSTRAINT "MemberDirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberDirectMessage" ADD CONSTRAINT "MemberDirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
