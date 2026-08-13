"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { MINISTRY_LEADER } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { MembershipQuestionnaireForm } from "@/components/onboarding/MembershipQuestionnaireForm";
import { isMobileAppPath } from "@/lib/mobile-paths";

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

  useEffect(() => {
    void fetch("/api/onboarding/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.status === "APPROVED") {
          router.replace(`${base}/dashboard`);
          return;
        }
        if (data.questionnaireRetakeRequested) {
          router.replace(`${base}/questionnaire`);
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

  function goToMessages() {
    router.push(`${base}/messages`);
  }

  async function handleQuestionnaireSuccess() {
    await updateSession({ questionnaireCompleted: true });
    setStep("complete");
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
        <MembershipQuestionnaireForm
          subheading="Step 2 of 3 — All questions are required"
          onSuccess={handleQuestionnaireSuccess}
        />
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

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
      {message}
    </div>
  );
}
