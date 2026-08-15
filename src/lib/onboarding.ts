import { z } from "zod";

export const SPIRITUAL_STAGE_OPTIONS = [
  "1. Holy Spirit has showed me the need of a Savior.",
  "2. I need to confess my sins, now that Jesus is my Savior.",
  "3. I need to be baptized.",
  "4. I have been baptized and have a SUDDEN NEW LIFE and revelation of freedom",
  "5. This new life and freedom has showed me there is a list of sins standing between me and spiritual freedom.",
  '6. This list of sins needs someone to agree with the accusations and that person IS ME!!! "IT ENDS WITH ME!!"',
  "7. I've been agreeing to the accusations and it has given me Godly Sorrow",
  "Numbers 1 - 5",
  "Numbers 1-7",
  "I don't understand why I have to agree with every accusation.",
] as const;

export const JESUS_LOVE_OPTIONS = [
  "I don't know who Jesus is as a person to love.",
  "I didn't know the Bible says I have to love Jesus.",
  "I know about Jesus being a Savior, but not a friend.",
  "I know about Jesus being a friend, but not a Savior",
  "I just want to get into a group that understands me",
  "(Write your answer)",
] as const;

export const questionnaireSchema = z.object({
  spiritualStage: z
    .string()
    .refine((value) =>
      SPIRITUAL_STAGE_OPTIONS.includes(value as (typeof SPIRITUAL_STAGE_OPTIONS)[number]),
    ),
  location: z.string().trim().min(1).max(100),
  witchcraft: z.string().trim().min(1).max(500),
  jesusLoveSelections: z.array(z.string()).min(2),
  jesusLoveCustom: z.string().max(500).optional(),
  relationshipWithJesus: z.string().trim().min(100).max(1000),
  bitterness: z.string().trim().min(1).max(500),
  baptism: z.string().trim().min(1).max(100),
});

export type QuestionnaireAnswers = z.infer<typeof questionnaireSchema>;

export const ONBOARDING_INVITE_TITLE =
  "Membership Approval — Personal One-on-One with Norman";

export const ONBOARDING_INVITE_MESSAGE =
  "Norman has invited you to a required personal one-on-one meeting to complete your membership approval. This is the meeting you need before joining the group — tap Join below when the session is live.";

export const QUESTIONNAIRE_RETAKE_TITLE = "Membership Questionnaire — Please Complete Again";

export const QUESTIONNAIRE_RETAKE_MESSAGE =
  "Norman has asked you to complete the membership questionnaire. Tap the button below to open the survey — you can return to this link anytime to finish where you left off.";

export const QUESTIONNAIRE_REMINDER_MESSAGE =
  "Reminder: please finish your membership questionnaire. Tap the button below to continue where you left off — your progress is saved until you submit.";

export const ONBOARDING_DUE_HOURS = 24;

export function computeOnboardingDueAt(from = new Date()) {
  return new Date(from.getTime() + ONBOARDING_DUE_HOURS * 60 * 60 * 1000);
}
