"use client";

import { useState } from "react";
import { Ban, UserX } from "lucide-react";
import { markBookingNoShow } from "@/lib/booking";
import { canMarkNoShow } from "@/lib/booking/no-show";
import {
  bookingNoShowFeeCents,
  shouldPromptNoShowFeeOnMark,
} from "@/lib/booking/no-show-fee";
import {
  PolicyFeeChargeIssuePanel,
  resolvePolicyFeeChargeIssue,
  type PolicyFeeChargeIssue,
} from "@/components/booking/policy-fee-charge-issue-panel";
import { formatPrice } from "@/lib/utils";
import {
  bookingActionBtnOrange,
  bookingActionCompactBtn,
  bookingActionMobileBtn,
  bookingScheduleToolbarBtn,
  bookingScheduleToolbarBtnIcon,
  bookingScheduleToolbarBtnLabel,
  visitActionsLink,
  visitActionsProblemRow,
  visitActionsProblemRowIcon,
} from "@/components/booking/booking-action-styles";
import type { Booking, BraiderProfile } from "@/lib/types";

type Props = {
  booking: Booking;
  braiderId: string;
  braider?: BraiderProfile | null;
  onMarked: (result: { booking: Booking; clientBlocked: boolean }) => void;
  className?: string;
  currency?: string;
  variant?: "default" | "compact" | "pill" | "compact-grid" | "mobile" | "schedule-toolbar" | "link" | "problem-row";
  /** Opens directly on the confirm step (e.g. problem-section panel). */
  initialStep?: "idle" | "confirm";
  onDismiss?: () => void;
};

type Step = "idle" | "confirm" | "fee_choice" | "rebook_choice";

export function NoShowBookingButton({
  booking,
  braiderId,
  braider,
  onMarked,
  className = "",
  currency = "usd",
  variant = "default",
  initialStep = "idle",
  onDismiss,
}: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [chargeIssue, setChargeIssue] = useState<PolicyFeeChargeIssue | null>(null);
  const [waiveNoShowFee, setWaiveNoShowFee] = useState(false);

  const feeCents = braider ? bookingNoShowFeeCents(braider, booking) : 0;
  const showFeeChoice = braider ? shouldPromptNoShowFeeOnMark(braider, booking) : false;

  if (booking.status === "no_show") {
    const feeLabel =
      booking.no_show_fee_status === "charged" && booking.no_show_fee_charged_cents
        ? ` · ${formatPrice(booking.no_show_fee_charged_cents, currency)} charged`
        : booking.no_show_fee_status === "payment_pending"
          ? " · payment link sent"
          : booking.no_show_fee_status === "waived"
            ? " · fee waived"
            : "";

    return (
      <div className={className}>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
          No-show{feeLabel}
        </span>
        {chargeIssue && braider && (
          <PolicyFeeChargeIssuePanel
            issue={chargeIssue}
            feeKind="no-show fee"
            clientId={booking.client_id}
            clientName={booking.client_name}
            clientEmail={booking.client_email}
            braiderId={braiderId}
            braider={braider}
            className="mt-2"
          />
        )}
      </div>
    );
  }

  if (!canMarkNoShow(booking)) {
    return null;
  }

  async function finish(blockClient: boolean, waiveFee: boolean) {
    setError("");
    setLoading(true);
    try {
      const result = await markBookingNoShow(booking.id, braiderId, blockClient, waiveFee);
      onMarked(result);
      setStep("idle");

      let feeNote = "";
      if (waiveFee) {
        feeNote = " No-show fee waived.";
        setChargeIssue(null);
      } else if (result.noShowFee?.mode === "charged" && result.noShowFee.amountCents) {
        feeNote = ` ${formatPrice(result.noShowFee.amountCents, currency)} no-show fee charged.`;
        setChargeIssue(null);
      } else if (result.noShowFee?.mode === "payment_link" || result.noShowFee?.mode === "failed") {
        const issue = result.noShowFee ? resolvePolicyFeeChargeIssue(result.noShowFee) : "charge_failed";
        setChargeIssue(issue);
        feeNote = "";
      } else if (!waiveFee && result.noShowFee?.mode === "skipped") {
        const issue = result.noShowFee ? resolvePolicyFeeChargeIssue(result.noShowFee) : "charge_unavailable";
        setChargeIssue(issue);
        feeNote =
          issue === "stripe_connect_not_ready"
            ? " No-show recorded, but the fee wasn't charged — finish Stripe payout setup first."
            : " No-show recorded, but the fee wasn't charged automatically.";
      } else {
        setChargeIssue(null);
      }

      setNote(
        blockClient
          ? `${booking.client_name} marked as no-show and blocked from rebooking.${feeNote}`
          : `${booking.client_name} marked as no-show. They can still book again.${feeNote}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark no-show");
    } finally {
      setLoading(false);
    }
  }

  if (step === "confirm") {
    return (
      <div className={`rounded-xl border border-orange-200 bg-orange-50/90 p-3 ${className}`}>
        <p className="text-sm font-semibold text-orange-950">
          Mark {booking.client_name} as a no-show?
        </p>
        <p className="mt-1 text-xs text-orange-800/90">
          Use this when they missed their appointment without cancelling.
          {showFeeChoice
            ? ` They agreed to a ${formatPrice(feeCents, currency)} no-show fee at booking — you'll choose whether to charge next.`
            : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => setStep(showFeeChoice ? "fee_choice" : "rebook_choice")}
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
          >
            Yes, no-show
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setStep("idle");
              setError("");
              onDismiss?.();
            }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === "fee_choice") {
    return (
      <div className={`rounded-xl border border-orange-200 bg-orange-50/90 p-3 ${className}`}>
        <p className="text-sm font-semibold text-orange-950">No-show fee for {booking.client_name}?</p>
        <p className="mt-1 text-xs text-orange-800/90">
          They agreed to {formatPrice(feeCents, currency)} at checkout. Charge their card on file when
          possible, or waive it if you're being flexible.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setWaiveNoShowFee(false);
              setStep("rebook_choice");
            }}
            className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
          >
            Charge {formatPrice(feeCents, currency)}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setWaiveNoShowFee(true);
              setStep("rebook_choice");
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            <Ban className="h-4 w-4" />
            Waive No-show Fee
          </button>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setStep("confirm")}
          className="mt-2 text-xs font-medium text-stone-500 hover:text-stone-700"
        >
          ← Back
        </button>
      </div>
    );
  }

  if (step === "rebook_choice") {
    return (
      <div className={`rounded-xl border border-violet-200 bg-violet-50/80 p-3 ${className}`}>
        <p className="text-sm font-semibold text-stone-900">
          Allow {booking.client_name} to rebook?
        </p>
        <p className="mt-1 text-xs text-stone-600">
          Choose whether this client can book with you again.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={() => void finish(false, waiveNoShowFee)}
            className="flex-1 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Yes — allow rebooking"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void finish(true, waiveNoShowFee)}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? "Saving…" : "No — block permanently"}
          </button>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setStep(showFeeChoice ? "fee_choice" : "confirm")}
          className="mt-2 text-xs font-medium text-stone-500 hover:text-stone-700"
        >
          ← Back
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const trigger = (
      <button
        type="button"
        onClick={() => {
          setStep("confirm");
          setNote("");
          setError("");
          setChargeIssue(null);
          setWaiveNoShowFee(false);
        }}
        className={
          variant === "problem-row"
            ? visitActionsProblemRow
            : variant === "link"
            ? visitActionsLink
            : variant === "schedule-toolbar"
            ? `${bookingScheduleToolbarBtn} hover:border-orange-200 hover:bg-orange-50/60`
            : variant === "mobile"
            ? `${bookingActionMobileBtn} border-orange-200 bg-white text-orange-900 hover:bg-orange-50`
            : variant === "compact-grid"
              ? `${bookingActionCompactBtn} border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100`
              : variant === "pill"
                ? `${bookingActionCompactBtn} min-h-[44px] rounded-full border-orange-300 bg-orange-50 px-4 py-2.5 text-sm text-orange-900 hover:bg-orange-100`
                : variant === "compact"
                  ? bookingActionBtnOrange
                  : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
        }
      >
        {variant === "problem-row" ? (
          <>
            <span className={visitActionsProblemRowIcon}>
              <UserX className="h-4 w-4" aria-hidden />
            </span>
            Client didn&apos;t show
          </>
        ) : variant === "link" ? (
          "Client didn't show"
        ) : variant === "schedule-toolbar" ? (
          <>
            <span className={`${bookingScheduleToolbarBtnIcon} bg-orange-100 text-orange-700`}>
              <UserX className="h-4 w-4" />
            </span>
            <span className={`${bookingScheduleToolbarBtnLabel} text-orange-900`}>No-Show</span>
          </>
        ) : (
          <>
            <UserX className="h-4 w-4" />
            {variant === "compact-grid" ? "Missed" : "Missed Appointment"}
          </>
        )}
      </button>
  );

  if (variant === "problem-row") {
    return (
      <>
        {trigger}
        {note && <p className="mt-2 px-4 text-xs font-medium text-stone-700">{note}</p>}
        {chargeIssue && braider && (
          <PolicyFeeChargeIssuePanel
            issue={chargeIssue}
            feeKind="no-show fee"
            clientId={booking.client_id}
            clientName={booking.client_name}
            clientEmail={booking.client_email}
            braiderId={braiderId}
            braider={braider}
            className="mx-4 mb-2 mt-2"
          />
        )}
      </>
    );
  }

  return (
    <div className={className}>
      {trigger}
      {note && <p className="mt-2 text-xs font-medium text-stone-700">{note}</p>}
      {chargeIssue && braider && (
        <PolicyFeeChargeIssuePanel
          issue={chargeIssue}
          feeKind="no-show fee"
          clientId={booking.client_id}
          clientName={booking.client_name}
          clientEmail={booking.client_email}
          braiderId={braiderId}
          braider={braider}
          className="mt-2"
        />
      )}
    </div>
  );
}
