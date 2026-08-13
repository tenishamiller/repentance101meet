-- AlterEnum
ALTER TYPE "MembershipMessageType" ADD VALUE 'QUESTIONNAIRE_RETAKE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "questionnaireRetakeRequestedAt" TIMESTAMP(3);
