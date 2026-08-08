"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { questionnaireToEntries } from "@/lib/survey-answers";
import type { QuestionnaireAnswers } from "@/lib/onboarding";
import { formatRequestDateTime } from "@/lib/utils";

type Submission = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  signedUpAt: string;
  completedAt: string;
  answers: QuestionnaireAnswers;
};

export function AdminSurveyAnswersPanel() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchSubmissions = useCallback(async () => {
    const res = await fetch("/api/admin/survey-answers");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSubmissions(data.submissions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  async function deleteSubmission(userId: string) {
    setDeletingId(userId);
    setError("");
    const res = await fetch("/api/admin/survey-answers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, confirm: true }),
    });
    setDeletingId(null);
    setConfirmingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not delete survey answers.");
      return;
    }

    setSubmissions((prev) => prev.filter((entry) => entry.id !== userId));
  }

  return (
    <div className="animate-fade-up space-y-6">
      <section className="card-brand p-6">
        <div className="mb-1 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gold-muted" />
          <h2 className="font-serif text-xl font-semibold text-burgundy">Survey Answers</h2>
        </div>
        <p className="text-sm text-burgundy/60">
          Membership questionnaire responses from signup. Expand a member to read each answer
          separately. Deleting removes their answers from this list only — it does not remove their
          account.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-burgundy/30 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-burgundy/60">Loading survey answers...</p>
      ) : submissions.length === 0 ? (
        <section className="card-brand p-8 text-center">
          <p className="font-medium text-burgundy/70">No survey answers yet.</p>
          <p className="mt-2 text-sm text-burgundy/55">
            Responses appear here after members complete the signup questionnaire.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => {
            const entries = questionnaireToEntries(submission.answers);
            const isConfirming = confirmingId === submission.id;

            return (
              <details
                key={submission.id}
                className="group card-brand overflow-hidden"
                open={submissions.length === 1 ? true : undefined}
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
                  <UserAvatar
                    userId={submission.id}
                    name={submission.name}
                    avatarUrl={submission.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg font-semibold text-burgundy">
                      {submission.name}
                    </p>
                    <p className="truncate text-sm text-burgundy/60">{submission.email}</p>
                    <p className="mt-1 text-xs text-burgundy/50">
                      Completed {formatRequestDateTime(submission.completedAt)}
                      {" · "}
                      Status: {submission.status === "REJECTED" ? "DENIED" : submission.status}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gold-muted group-open:hidden">
                    View answers
                  </span>
                  <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wide text-gold-muted group-open:inline">
                    Hide
                  </span>
                </summary>

                <div className="border-t border-gold/15 px-5 pb-5 pt-4">
                  <div className="space-y-4">
                    {entries.map((entry) => (
                      <div
                        key={entry.label}
                        className="rounded-xl border border-gold/20 bg-cream-dark px-4 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-burgundy/55">
                          {entry.label}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-burgundy">
                          {entry.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 border-t border-gold/15 pt-4">
                    {!isConfirming ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(submission.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-burgundy/25 px-4 py-2 text-sm font-medium text-burgundy/70 hover:bg-burgundy/5 hover:text-burgundy"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete survey answers
                      </button>
                    ) : (
                      <div className="rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-4">
                        <p className="text-sm font-medium text-burgundy">
                          Delete {submission.name}&apos;s survey answers from this list?
                        </p>
                        <p className="mt-1 text-xs text-burgundy/65">
                          Their account stays active. This cannot be undone.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={deletingId === submission.id}
                            onClick={() => void deleteSubmission(submission.id)}
                            className="rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark disabled:opacity-60"
                          >
                            {deletingId === submission.id ? "Deleting..." : "Confirm delete"}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === submission.id}
                            onClick={() => setConfirmingId(null)}
                            className="rounded-lg border border-burgundy/25 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
