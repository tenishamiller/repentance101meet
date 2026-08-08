-- AlterTable
ALTER TABLE "ChannelMembership" ADD COLUMN "requestedAt" TIMESTAMP(3);

UPDATE "ChannelMembership" SET "requestedAt" = "createdAt";

ALTER TABLE "ChannelMembership" ALTER COLUMN "requestedAt" SET NOT NULL;
ALTER TABLE "ChannelMembership" ALTER COLUMN "requestedAt" SET DEFAULT CURRENT_TIMESTAMP;
