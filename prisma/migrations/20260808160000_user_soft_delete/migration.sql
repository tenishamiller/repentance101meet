-- AlterEnum
ALTER TYPE "MemberActivityType" ADD VALUE 'MEMBER_DELETED';
ALTER TYPE "MemberActivityType" ADD VALUE 'MEMBER_RESTORED';
ALTER TYPE "MemberActivityType" ADD VALUE 'MEMBER_PURGED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "purgeAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "User_purgeAt_idx" ON "User"("purgeAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
