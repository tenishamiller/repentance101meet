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

function formatRawAnswerValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? `• ${item}` : String(item)))
      .join("\n");
  }
  if (value == null) return "";
  return String(value);
}

/** Best-effort display when stored answers no longer match the current schema. */
export function rawQuestionnaireToEntries(raw: unknown): SurveyAnswerEntry[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const record = raw as Record<string, unknown>;
  const orderedKeys: (keyof QuestionnaireAnswers)[] = [
    "spiritualStage",
    "location",
    "witchcraft",
    "jesusLoveSelections",
    "jesusLoveCustom",
    "relationshipWithJesus",
    "bitterness",
    "baptism",
  ];

  return orderedKeys
    .map((key) => {
      const value = formatRawAnswerValue(record[key]);
      if (!value) return null;
      return { label: FIELD_LABELS[key], value };
    })
    .filter((entry): entry is SurveyAnswerEntry => entry !== null);
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
