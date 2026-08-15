import { z } from "zod";

export const questionnaireDraftSchema = z.object({
  spiritualStage: z.string().optional().default(""),
  location: z.string().optional().default(""),
  witchcraft: z.string().optional().default(""),
  jesusLoveSelections: z.array(z.string()).optional().default([]),
  jesusLoveCustom: z.string().optional().default(""),
  relationshipWithJesus: z.string().optional().default(""),
  bitterness: z.string().optional().default(""),
  baptism: z.string().optional().default(""),
});

export type QuestionnaireDraft = z.infer<typeof questionnaireDraftSchema>;

const STORAGE_PREFIX = "r101-questionnaire-draft:";

export function questionnaireDraftStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function emptyQuestionnaireDraft(): QuestionnaireDraft {
  return {
    spiritualStage: "",
    location: "",
    witchcraft: "",
    jesusLoveSelections: [],
    jesusLoveCustom: "",
    relationshipWithJesus: "",
    bitterness: "",
    baptism: "",
  };
}

export function parseQuestionnaireDraft(raw: unknown): QuestionnaireDraft | null {
  const parsed = questionnaireDraftSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function draftHasProgress(draft: QuestionnaireDraft): boolean {
  return Boolean(
    draft.spiritualStage.trim() ||
      draft.location.trim() ||
      draft.witchcraft.trim() ||
      draft.jesusLoveSelections.length > 0 ||
      draft.jesusLoveCustom.trim() ||
      draft.relationshipWithJesus.trim() ||
      draft.bitterness.trim() ||
      draft.baptism.trim(),
  );
}

export function loadLocalQuestionnaireDraft(userId: string): QuestionnaireDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(questionnaireDraftStorageKey(userId));
    if (!raw) return null;
    return parseQuestionnaireDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalQuestionnaireDraft(userId: string, draft: QuestionnaireDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(questionnaireDraftStorageKey(userId), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearLocalQuestionnaireDraft(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(questionnaireDraftStorageKey(userId));
  } catch {
    /* ignore */
  }
}
