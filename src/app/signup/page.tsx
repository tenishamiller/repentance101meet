"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { MINISTRY_LEADER } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { isMobileAppPath } from "@/lib/mobile-paths";
import {
  JESUS_LOVE_OPTIONS,
  SPIRITUAL_STAGE_OPTIONS,
} from "@/lib/onboarding";

type Step = "account" | "questionnaire" | "complete";

export default function SignupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { update: updateSession } = useSession();
  const base = isMobileAppPath(pathname) ? "/m" : "";
  const [step, setStep] = useState<Step>("account");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [spiritualStage, setSpiritualStage] = useState("");
  const [location, setLocation] = useState("");
  const [witchcraft, setWitchcraft] = useState("");
  const [jesusLoveSelections, setJesusLoveSelections] = useState<string[]>([]);
  const [jesusLoveCustom, setJesusLoveCustom] = useState("");
  const [relationshipWithJesus, setRelationshipWithJesus] = useState("");
  const [bitterness, setBitterness] = useState("");
  const [baptism, setBaptism] = useState("");

  useEffect(() => {
    void fetch("/api/onboarding/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.status === "APPROVED") {
          router.replace(`${base}/dashboard`);
          return;
        }
        if (data.questionnaireCompleted && data.status === "PENDING") {
          router.replace(`${base}/messages`);
          return;
        }
        if (data.status === "PENDING" && !data.questionnaireCompleted) {
          setStep("questionnaire");
        }
      });
  }, [router]);

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Signup failed");
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (signInResult?.error) {
      setError("Account created but sign-in failed. Please log in to continue.");
      return;
    }

    setStep("questionnaire");
  }

  function toggleJesusLove(option: string) {
    setJesusLoveSelections((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  }

  async function handleQuestionnaireSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (jesusLoveSelections.length < 2) {
      setError("Please pick at least two options for the Jesus love question.");
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
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save questionnaire");
      return;
    }

    await updateSession({ questionnaireCompleted: true });
    setStep("complete");
  }

  function goToMessages() {
    router.push(`${base}/messages`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {step === "account" && (
        <>
          <div className="mb-8 text-center lg:hidden">
            <Image
              src="/brand/repentance101-logo.png"
              alt="Repentance 101"
              width={120}
              height={120}
              className="seal-ring mx-auto rounded-full"
            />
          </div>
          <h1 className="font-serif text-3xl font-bold text-burgundy">Join Repentance 101</h1>
          <p className="mt-2 text-burgundy/70">Step 1 of 3 — Create your account</p>

          <form onSubmit={handleAccountSubmit} className="mt-8 space-y-4">
            {error && <ErrorBox message={error} />}
            <Field label="Full Name" value={name} onChange={setName} required />
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field
              label="Password (min 8 characters)"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={8}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "Creating account..." : "Continue to Questionnaire"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-burgundy/70">
            Already a member?{" "}
            <Link href={`${base}/login`} className="font-medium text-gold-muted hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}

      {step === "questionnaire" && (
        <>
          <h1 className="font-serif text-3xl font-bold text-burgundy">Membership Questionnaire</h1>
          <p className="mt-2 text-burgundy/70">Step 2 of 3 — All questions are required</p>
          <BrandDivider className="my-6 max-w-xs" />

          <form onSubmit={handleQuestionnaireSubmit} className="space-y-8">
            {error && <ErrorBox message={error} />}

            <QuestionBlock
              title="This is a Bloodline Repentance Group, and each of us are on a journey through the following stages. In this journey, there is the requirement to participate in all stages. Where are you in this list?"
              required
            >
              <div className="space-y-2">
                {SPIRITUAL_STAGE_OPTIONS.map((option) => (
                  <label key={option} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gold/25 bg-cream px-3 py-2">
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
                  <label key={option} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gold/25 bg-cream px-3 py-2">
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

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "Submitting..." : "Submit Questionnaire"}
            </button>
          </form>
        </>
      )}

      {step === "complete" && (
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-burgundy">One More Step</h1>
          <BrandDivider className="mx-auto my-6 max-w-xs" />
          <div className="rounded-2xl border border-gold/40 bg-gold/10 px-6 py-6 text-left text-burgundy">
            <p className="text-lg font-semibold">Personal one-on-one with Norman required</p>
            <p className="mt-3 text-sm leading-relaxed text-burgundy/80">
              Your questionnaire has been sent to {MINISTRY_LEADER}. Before you can join the
              group, Norman must meet with you personally in a one-on-one session to approve your
              membership.
            </p>
            <p className="mt-4 rounded-xl border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm font-medium text-burgundy">
              Important: If you do not complete your meeting with Norman within 24 hours, your
              membership request will be denied and your account will be removed from the group.
            </p>
            <p className="mt-4 text-sm text-burgundy/70">
              Until you are approved, your only access is the Membership Messages center — where
              Norman will contact you and send your one-on-one meeting link.
            </p>
          </div>
          <button type="button" onClick={goToMessages} className="btn-primary mt-8 w-full sm:w-auto">
            Go to Membership Messages
          </button>
        </div>
      )}
    </div>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-burgundy">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </div>
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
