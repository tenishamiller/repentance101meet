"use client";

import { useState } from "react";
import { BrandDivider } from "@/components/BrandDivider";
import {
  JESUS_LOVE_OPTIONS,
  SPIRITUAL_STAGE_OPTIONS,
} from "@/lib/onboarding";

type Props = {
  submitLabel?: string;
  heading?: string;
  subheading?: string;
  onSuccess: () => void | Promise<void>;
};

export function MembershipQuestionnaireForm({
  submitLabel = "Submit Questionnaire",
  heading = "Membership Questionnaire",
  subheading = "All questions are required",
  onSuccess,
}: Props) {
  const [spiritualStage, setSpiritualStage] = useState("");
  const [location, setLocation] = useState("");
  const [witchcraft, setWitchcraft] = useState("");
  const [jesusLoveSelections, setJesusLoveSelections] = useState<string[]>([]);
  const [jesusLoveCustom, setJesusLoveCustom] = useState("");
  const [relationshipWithJesus, setRelationshipWithJesus] = useState("");
  const [bitterness, setBitterness] = useState("");
  const [baptism, setBaptism] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleJesusLove(option: string) {
    setJesusLoveSelections((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  }

  function validationMessages(): string[] {
    const messages: string[] = [];
    if (!spiritualStage) messages.push("Select where you are in the spiritual stages list.");
    if (!location.trim()) messages.push("Enter your country or state.");
    if (!witchcraft.trim()) messages.push("Answer the witchcraft question.");
    if (jesusLoveSelections.length < 2) {
      messages.push("Pick at least two options for the Jesus love question.");
    }
    if (
      jesusLoveSelections.includes("(Write your answer)") &&
      !jesusLoveCustom.trim()
    ) {
      messages.push("Write your custom answer for the Jesus love question.");
    }
    if (relationshipWithJesus.trim().length < 100) {
      messages.push(
        `Write at least 100 characters about your relationship with Jesus (${Math.max(0, 100 - relationshipWithJesus.trim().length)} more needed).`,
      );
    }
    if (!bitterness.trim()) messages.push("Answer the bitterness / unforgiveness question.");
    if (!baptism.trim()) messages.push("Answer the baptism question.");
    return messages;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const messages = validationMessages();
    if (messages.length > 0) {
      setError(messages.join(" "));
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spiritualStage,
        location,
        witchcraft,
        jesusLoveSelections,
        jesusLoveCustom: jesusLoveCustom || undefined,
        relationshipWithJesus,
        bitterness,
        baptism,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Could not save questionnaire",
      );
      return;
    }

    await onSuccess();
  }

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-burgundy">{heading}</h1>
      <p className="mt-2 text-burgundy/70">{subheading}</p>
      <BrandDivider className="my-6 max-w-xs" />

      <form onSubmit={handleSubmit} className="space-y-8">
        <QuestionBlock
          title="This is a Bloodline Repentance Group, and each of us are on a journey through the following stages. In this journey, there is the requirement to participate in all stages. Where are you in this list?"
          required
        >
          <div className="space-y-2">
            {SPIRITUAL_STAGE_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-gold/25 bg-cream px-3 py-2"
              >
                <input
                  type="radio"
                  name="spiritualStage"
                  required
                  checked={spiritualStage === option}
                  onChange={() => setSpiritualStage(option)}
                  className="mt-1"
                />
                <span className="text-sm text-burgundy/90">{option}</span>
              </label>
            ))}
          </div>
        </QuestionBlock>

        <QuestionBlock
          title="What country or state are you in? (relevance is the spiritual authorities)"
          required
        >
          <TextArea value={location} onChange={setLocation} maxLength={100} required />
          <CharCount current={location.length} max={100} />
        </QuestionBlock>

        <QuestionBlock
          title="When it comes to the thing of witchcraft, do you think you've dabbled in any? Things like tarot cards, going to a palm reader, astrology, etc"
          required
        >
          <TextArea value={witchcraft} onChange={setWitchcraft} maxLength={500} required />
          <CharCount current={witchcraft.length} max={500} />
        </QuestionBlock>

        <QuestionBlock
          title="Because Jesus loves all the people of the world, do you experience His love in your life? Do you know what it means to experience? (There is a group on Telegram that is specifically for you, in this instance.) PICK TWO or more."
          required
        >
          <div className="space-y-2">
            {JESUS_LOVE_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-gold/25 bg-cream px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={jesusLoveSelections.includes(option)}
                  onChange={() => toggleJesusLove(option)}
                  className="mt-1"
                />
                <span className="text-sm text-burgundy/90">{option}</span>
              </label>
            ))}
          </div>
          {jesusLoveSelections.includes("(Write your answer)") && (
            <input
              type="text"
              value={jesusLoveCustom}
              onChange={(e) => setJesusLoveCustom(e.target.value)}
              className="input-field mt-3"
              placeholder="Write your answer"
              required
            />
          )}
        </QuestionBlock>

        <QuestionBlock title="How would you describe your relationship with Jesus Christ" required>
          <TextArea
            value={relationshipWithJesus}
            onChange={setRelationshipWithJesus}
            maxLength={1000}
            required
            rows={5}
          />
          <div className="mt-1 flex justify-between text-xs text-burgundy/50">
            <span>
              {relationshipWithJesus.length < 100
                ? `Characters needed: ${100 - relationshipWithJesus.length}`
                : "Minimum met"}
            </span>
            <span>Characters remaining: {1000 - relationshipWithJesus.length}</span>
          </div>
        </QuestionBlock>

        <QuestionBlock
          title="Do you struggle with bitterness or unforgiveness against anyone?"
          required
        >
          <TextArea value={bitterness} onChange={setBitterness} maxLength={500} required />
          <CharCount current={bitterness.length} max={500} />
        </QuestionBlock>

        <QuestionBlock
          title="Have you been baptized with full submersion? As in, all parts of you was under the water at the same time?"
          required
        >
          <TextArea value={baptism} onChange={setBaptism} maxLength={100} required />
          <CharCount current={baptism.length} max={100} />
        </QuestionBlock>

        {error && <ErrorBox message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading ? "Submitting..." : submitLabel}
        </button>
        <p className="text-center text-xs text-burgundy/55">
          Tip: the relationship-with-Jesus answer needs at least 100 characters, and the Jesus-love
          question needs two or more selections.
        </p>
      </form>
    </>
  );
}

function QuestionBlock({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold leading-snug text-burgundy">
        {title}
        {required && <span className="text-red-600"> *</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TextArea({
  value,
  onChange,
  maxLength,
  required,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  required?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      required={required}
      value={value}
      maxLength={maxLength}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="input-field resize-y"
    />
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  return (
    <p className="mt-1 text-right text-xs text-burgundy/50">
      Characters remaining: {max - current}
    </p>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
      {message}
    </div>
  );
}
