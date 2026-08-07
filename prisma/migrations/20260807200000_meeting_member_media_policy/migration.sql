-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN "memberVideoEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Meeting" ADD COLUMN "memberMicEnabled" BOOLEAN NOT NULL DEFAULT true;
