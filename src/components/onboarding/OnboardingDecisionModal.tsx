"use client";

type Props = {
  memberName: string;
  userId: string;
  meetingId?: string;
  onApprove: () => void;
  onDeny: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function OnboardingDecisionModal({
  memberName,
  onApprove,
  onDeny,
  onCancel,
  loading = false,
}: Props) {
  function handleDeny() {
    const sure = window.confirm(
      `Are you sure you want to DENY ${memberName}? Their profile will be permanently deleted.`,
    );
    if (!sure) return;
    const final = window.confirm(
      "Final confirmation: Deny membership and delete this account?",
    );
    if (!final) return;
    onDeny();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-burgundy-deep/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gold/40 bg-cream p-6 shadow-2xl">
        <h2 className="font-serif text-xl font-bold text-burgundy">Membership Decision</h2>
        <p className="mt-3 text-sm leading-relaxed text-burgundy/80">
          The personal one-on-one with <strong>{memberName}</strong> has ended. Is this member
          approved to join Repentance 101?
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onApprove}
            className="btn-primary w-full disabled:opacity-60"
          >
            Approve — Grant Full Access
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDeny}
            className="w-full rounded-xl border-2 border-burgundy bg-burgundy/10 px-4 py-3 font-semibold text-burgundy hover:bg-burgundy/15 disabled:opacity-60"
          >
            Deny — Delete Account
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="text-sm text-burgundy/60 hover:text-burgundy"
          >
            Decide later
          </button>
        </div>
      </div>
    </div>
  );
}
