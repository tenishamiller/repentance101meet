"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { MembershipQuestionnaireForm } from "@/components/onboarding/MembershipQuestionnaireForm";
import { isMobileAppPath } from "@/lib/mobile-paths";

export default function QuestionnaireRetakePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { update: updateSession } = useSession();
  const base = isMobileAppPath(pathname) ? "/m" : "";
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/onboarding/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          setError("Could not load your account status.");
          setReady(true);
          return;
        }
        if (data.role === "ADMIN") {
          setError(
            "This survey is for the member. They need to open the link while signed into their own account.",
          );
          setReady(true);
          return;
        }
        if (data.questionnaireRetakeRequested) {
          setAllowed(true);
          setReady(true);
          return;
        }
        if (data.status === "PENDING" && !data.questionnaireCompleted) {
          router.replace(`${base}/signup`);
          return;
        }
        setError("There is no questionnaire waiting for you right now.");
        setReady(true);
      })
      .catch(() => {
        setError("Could not load your account status.");
        setReady(true);
      });
  }, [base, router]);

  async function handleSuccess() {
    await updateSession({ questionnaireCompleted: true });
    router.push(`${base}/messages`);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-burgundy/70">
        Loading questionnaire…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-burgundy/80">{error || "Questionnaire unavailable."}</p>
        <Link href={`${base}/messages`} className="btn-primary mt-6 inline-block">
          Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <MembershipQuestionnaireForm
        heading="Membership Questionnaire"
        subheading="Norman asked you to complete this survey again. All questions are required."
        submitLabel="Submit Updated Questionnaire"
        onSuccess={handleSuccess}
      />
    </div>
  );
}
