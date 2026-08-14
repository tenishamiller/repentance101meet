"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Mail, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { PaginatedScrollList } from "@/components/admin/PaginatedScrollList";
import { formatRequestDateTime } from "@/lib/utils";

type Submission = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  signedUpAt: string;
  completedAt: string;
  isDeleted: boolean;
  recordedByAdmin: boolean;
  parseWarning: string | null;
  entries: { label: string; value: string }[];
};

type IncompleteSignup = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  signedUpAt: string;
  isDeleted: boolean;
  hasMembershipThread: boolean;
  missingReason: string;
  missingReasonLabel: string;
  retakeRequested: boolean;
};

export function AdminSurveyAnswersPanel() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [incomplete, setIncomplete] = useState<IncompleteSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retakeSendingId, setRetakeSendingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const fetchSubmissions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetch("/api/admin/survey-answers");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSubmissions(data.submissions ?? []);
    setIncomplete(data.incomplete ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSubmissions();
    const interval = window.setInterval(() => {
      void fetchSubmissions(true);
    }, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchSubmissions(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
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

  async function requestRetake(userId: string, memberName: string) {
    setRetakeSendingId(userId);
    setError("");
    setSuccessMessage("");
    const res = await fetch("/api/admin/survey-answers/retake-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setRetakeSendingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not send retake request.");
      return;
    }

    setSuccessMessage(`Survey retake sent to ${memberName} in their membership messages.`);
    void fetchSubmissions();
  }

  const completedCount = submissions.length;
  const incompleteCount = incomplete.length;

  return (
    <div className="animate-fade-up space-y-6">
      <section className="card-brand p-6">
        <div className="mb-1 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gold-muted" />
          <h2 className="font-serif text-xl font-semibold text-burgundy">Survey Answers</h2>
        </div>
        <p className="text-sm text-burgundy/60">
          Completed surveys are listed below. If someone has not finished, their name appears in the
          short note under the count — not in a separate box.
        </p>
        {!loading && (
          <p className="mt-3 text-sm font-medium text-burgundy">
            {completedCount} completed
            {incompleteCount > 0 ? ` · ${incompleteCount} still needed` : ""}
          </p>
        )}
        {!loading && incomplete.length > 0 && (
          <details className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-burgundy">
              Still needed ({incomplete.length}) — tap for names
            </summary>
            <ul className="mt-3 space-y-3">
              {incomplete.map((member) => (
                <li key={member.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-burgundy">{member.name}</p>
                      <p className="text-xs text-burgundy/60">
                        {member.retakeRequested
                          ? "Survey sent — waiting on them"
                          : member.missingReasonLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={retakeSendingId === member.id || member.retakeRequested}
                      onClick={() => void requestRetake(member.id, member.name)}
                      className="inline-flex items-center gap-1 rounded-lg border border-burgundy/25 bg-cream px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-burgundy/5 disabled:opacity-60"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {member.retakeRequested
                        ? "Sent"
                        : retakeSendingId === member.id
                          ? "Sending..."
                          : "Send"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-burgundy/30 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-burgundy">
          {successMessage}
        </div>
      )}

      {loading ? (
        <p className="text-burgundy/60">Loading survey answers...</p>
      ) : submissions.length === 0 && incomplete.length === 0 ? (
        <section className="card-brand p-8 text-center">
          <p className="font-medium text-burgundy/70">No survey answers yet.</p>
        </section>
      ) : (
        <>
          {submissions.length > 0 && (
            <PaginatedScrollList
              items={submissions}
              pageSize={10}
              listClassName="space-y-3"
              getKey={(submission) => submission.id}
              renderItem={(submission) => {
                const isConfirming = confirmingId === submission.id;

                return (
                  <details
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
                          {submission.isDeleted && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-burgundy/50">
                              Removed
                            </span>
                          )}
                          {submission.recordedByAdmin && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-gold-muted">
                              Admin recorded
                            </span>
                          )}
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
                      {submission.parseWarning && (
                        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-3 text-sm text-burgundy">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{submission.parseWarning}</span>
                        </div>
                      )}

                      <div className="space-y-4">
                        {submission.entries.length === 0 ? (
                          <p className="text-sm text-burgundy/60">No answer text saved.</p>
                        ) : (
                          submission.entries.map((entry) => (
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
                          ))
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-gold/15 pt-4">
                        <button
                          type="button"
                          disabled={retakeSendingId === submission.id}
                          onClick={() => void requestRetake(submission.id, submission.name)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-cream px-4 py-2 text-sm font-semibold text-burgundy hover:bg-gold/10 disabled:opacity-60"
                        >
                          <Mail className="h-4 w-4" />
                          {retakeSendingId === submission.id ? "Sending..." : "Request retake"}
                        </button>
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
                          <div className="w-full rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-4">
                            <p className="text-sm font-medium text-burgundy">
                              Delete {submission.name}&apos;s survey answers from this list?
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
              }}
            />
          )}

        </>
      )}
    </div>
  );
}
