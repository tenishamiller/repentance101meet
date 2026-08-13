"use client";

import { useState } from "react";
import {
  JESUS_LOVE_OPTIONS,
  SPIRITUAL_STAGE_OPTIONS,
  type QuestionnaireAnswers,
} from "@/lib/onboarding";

type Props = {
  userId: string;
  memberName: string;
  onSaved: () => void;
  onCancel: () => void;
};

export function AdminRecordSurveyForm({ userId, memberName, onSaved, onCancel }: Props) {
  const [spiritualStage, setSpiritualStage] = useState("");
  const [location, setLocation] = useState("");
  const [witchcraft, setWitchcraft] = useState("");
  const [jesusLoveSelections, setJesusLoveSelections] = useState<string[]>([]);
  const [jesusLoveCustom, setJesusLoveCustom] = useState("");
  const [relationshipWithJesus, setRelationshipWithJesus] = useState("");
  const [bitterness, setBitterness] = useState("");
  const [baptism, setBaptism] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleJesusLove(option: string) {
    setJesusLoveSelections((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload: QuestionnaireAnswers = {
      spiritualStage,
      location: location.trim(),
      witchcraft: witchcraft.trim(),
      jesusLoveSelections,
      jesusLoveCustom: jesusLoveCustom.trim() || undefined,
      relationshipWithJesus: relationshipWithJesus.trim(),
      bitterness: bitterness.trim(),
      baptism: baptism.trim(),
    };

    const res = await fetch("/api/admin/survey-answers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save survey.");
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={(e) => void save(e)} className="mt-4 space-y-4 border-t border-gold/20 pt-4">
      <p className="text-sm font-medium text-burgundy">
        Record questionnaire answers for {memberName}
      </p>
      {error && (
        <p className="rounded-lg border border-burgundy/25 bg-burgundy/5 px-3 py-2 text-sm text-burgundy">
          {error}
        </p>
      )}

      <label className="block text-xs font-semibold text-burgundy">
        Spiritual journey stage
        <select
          required
          value={spiritualStage}
          onChange={(e) => setSpiritualStage(e.target.value)}
          className="input-field mt-1 text-sm"
        >
          <option value="">Select…</option>
          {SPIRITUAL_STAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-semibold text-burgundy">
        Country or state
        <textarea
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          rows={2}
          className="input-field mt-1 text-sm"
        />
      </label>

      <label className="block text-xs font-semibold text-burgundy">
        Witchcraft / occult dabbling
        <textarea
          required
          value={witchcraft}
          onChange={(e) => setWitchcraft(e.target.value)}
          maxLength={500}
          rows={3}
          className="input-field mt-1 text-sm"
        />
      </label>

      <fieldset>
        <legend className="text-xs font-semibold text-burgundy">
          Experiencing Jesus&apos; love (pick two or more)
        </legend>
        <div className="mt-2 space-y-1.5">
          {JESUS_LOVE_OPTIONS.map((option) => (
            <label key={option} className="flex items-start gap-2 text-sm text-burgundy/90">
              <input
                type="checkbox"
                checked={jesusLoveSelections.includes(option)}
                onChange={() => toggleJesusLove(option)}
                className="mt-1"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {jesusLoveSelections.includes("(Write your answer)") && (
          <input
            type="text"
            value={jesusLoveCustom}
            onChange={(e) => setJesusLoveCustom(e.target.value)}
            className="input-field mt-2 text-sm"
            placeholder="Write your answer"
            required
          />
        )}
      </fieldset>

      <label className="block text-xs font-semibold text-burgundy">
        Relationship with Jesus Christ (min 100 characters)
        <textarea
          required
          value={relationshipWithJesus}
          onChange={(e) => setRelationshipWithJesus(e.target.value)}
          maxLength={1000}
          rows={4}
          className="input-field mt-1 text-sm"
        />
      </label>

      <label className="block text-xs font-semibold text-burgundy">
        Bitterness or unforgiveness
        <textarea
          required
          value={bitterness}
          onChange={(e) => setBitterness(e.target.value)}
          maxLength={500}
          rows={3}
          className="input-field mt-1 text-sm"
        />
      </label>

      <label className="block text-xs font-semibold text-burgundy">
        Full submersion baptism
        <textarea
          required
          value={baptism}
          onChange={(e) => setBaptism(e.target.value)}
          maxLength={100}
          rows={2}
          className="input-field mt-1 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={
            saving ||
            jesusLoveSelections.length < 2 ||
            relationshipWithJesus.trim().length < 100 ||
            !spiritualStage
          }
          className="btn-primary !px-4 !py-2 text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save survey answers"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-burgundy/70 hover:bg-cream-dark"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
