import { questionnaireSchema, type QuestionnaireAnswers } from "@/lib/onboarding";

export type SurveyAnswerEntry = {
  label: string;
  value: string;
};

const FIELD_LABELS: Record<keyof QuestionnaireAnswers, string> = {
  spiritualStage: "Spiritual journey stage",
  location: "Country or state",
  witchcraft: "Witchcraft / occult dabbling",
  jesusLoveSelections: "Experiencing Jesus' love (selections)",
  jesusLoveCustom: "Experiencing Jesus' love (written answer)",
  relationshipWithJesus: "Relationship with Jesus Christ",
  bitterness: "Bitterness or unforgiveness",
  baptism: "Full submersion baptism",
};

export function parseQuestionnaireAnswers(raw: unknown): QuestionnaireAnswers | null {
  const result = questionnaireSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function questionnaireToEntries(answers: QuestionnaireAnswers): SurveyAnswerEntry[] {
  const entries: SurveyAnswerEntry[] = [
    { label: FIELD_LABELS.spiritualStage, value: answers.spiritualStage },
    { label: FIELD_LABELS.location, value: answers.location },
    { label: FIELD_LABELS.witchcraft, value: answers.witchcraft },
    {
      label: FIELD_LABELS.jesusLoveSelections,
      value: answers.jesusLoveSelections.map((item) => `• ${item}`).join("\n"),
    },
  ];

  if (answers.jesusLoveCustom?.trim()) {
    entries.push({
      label: FIELD_LABELS.jesusLoveCustom,
      value: answers.jesusLoveCustom.trim(),
    });
  }

  entries.push(
    { label: FIELD_LABELS.relationshipWithJesus, value: answers.relationshipWithJesus },
    { label: FIELD_LABELS.bitterness, value: answers.bitterness },
    { label: FIELD_LABELS.baptism, value: answers.baptism },
  );

  return entries;
}
