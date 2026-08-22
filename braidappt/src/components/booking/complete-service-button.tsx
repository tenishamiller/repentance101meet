"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  chargeBookingLateFee,
  markBookingServiceComplete,
  updateBookingLateFeeStatus,
} from "@/lib/booking";
import { canMarkServiceComplete } from "@/lib/booking/complete-service";
import {
  bookingLateFeeCents,
  canChargeLateFee,
  shouldPromptLateFeeOnComplete,
} from "@/lib/booking/late-fee";
import { braiderStripeConnectReady } from "@/lib/stripe/connect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LateFeeChoiceList, type LateFeeChoice } from "@/components/booking/late-fee-choice-list";
import {
  PolicyFeeChargeIssuePanel,
  resolvePolicyFeeChargeIssue,
  type PolicyFeeChargeIssue,
} from "@/components/booking/policy-fee-charge-issue-panel";
import { formatPrice } from "@/lib/utils";
import { ServiceCompletedStatus } from "@/components/booking/service-completed-status";
import {
  bookingActionBtnPrimaryOutline,
  bookingActionCompactPrimary,
  bookingActionMobilePrimary,
  visitActionsPrimaryBtnComplete,
} from "@/components/booking/booking-action-styles";
import type { Booking, BraiderProfile } from "@/lib/types";

type Props = {
  booking: Booking;
  braiderId: string;
  braider?: BraiderProfile | null;
  onCompleted: (booking: Booking) => void;
  /** When true, copy mentions the client paying remaining balance after completion. */
  promptBalancePayment?: boolean;
  /** Hero = full-width primary CTA in the schedule action hub. */
  variant?: "default" | "hero" | "compact" | "mobile" | "visit";
  className?: string;
};

type Step = "idle" | "late_fee" | "confirm";

export function CompleteServiceButton({
  booking,
  braiderId,
  braider,
  onCompleted,
  promptBalancePayment = false,
  variant = "default",
  className = "",
}: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [chargeIssue, setChargeIssue] = useState<PolicyFeeChargeIssue | null>(null);

  const feeCents = braider ? bookingLateFeeCents(braider, booking) : 0;
  const showLateFeePrompt = braider
    ? shouldPromptLateFeeOnComplete(braider, booking)
    : false;
  const showChargeOption =
    Boolean(braider) &&
    canChargeLateFee(braider, booking) &&
    braiderStripeConnectReady(braider);

  if (booking.status === "completed") {
    return <ServiceCompletedStatus className={className} />;
  }

  if (!canMarkServiceComplete(booking)) {
    return null;
  }

  async function completeAppointment(latestBooking: Booking) {
    let completionPhotoUrl: string | undefined;
    if (photoFile && isSupabaseConfigured()) {
      const form = new FormData();
      form.append("photo", photoFile);
      const uploadRes = await fetch(`/api/bookings/${latestBooking.id}/completion-photo`, {
        method: "POST",
        body: form,
      });
      const uploadData = (await uploadRes.json()) as { publicUrl?: string; error?: string };
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Could not upload photo");
      completionPhotoUrl = uploadData.publicUrl;
    }

    const updated = await markBookingServiceComplete(latestBooking.id, braiderId, {
      completionPhotoUrl,
    });
    onCompleted(updated);
    setStep("idle");
    setPhotoFile(null);
    setNote(
      promptBalancePayment
        ? `${latestBooking.client_name} can now pay their service balance from My Bookings.`
        : `${latestBooking.client_name}'s appointment is marked complete.`,
    );
  }

  async function handleLateFeeChoice(choice: LateFeeChoice) {
    if (!braider) return;
    setError("");
    setLoading(true);
    try {
      let workingBooking = booking;
      if (choice === "charge") {
        const result = await chargeBookingLateFee(booking.id, braiderId, feeCents);
        workingBooking = result.booking;
        if (result.mode === "charged") {
          setChargeIssue(null);
        } else {
          setChargeIssue(resolvePolicyFeeChargeIssue(result));
        }
      } else if (choice === "waive") {
        workingBooking = await updateBookingLateFeeStatus(booking.id, braiderId, "waived");
        setChargeIssue(null);
      } else if (choice === "handled_outside") {
        workingBooking = await updateBookingLateFeeStatus(booking.id, braiderId, "handled_outside");
      } else {
        workingBooking = await updateBookingLateFeeStatus(booking.id, braiderId, "marked_late");
      }
      await completeAppointment(workingBooking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete appointment");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      await completeAppointment(booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark service complete");
    } finally {
      setLoading(false);
    }
  }

  function openFlow() {
    setNote("");
    setError("");
    // Visit complete closes the appointment only — late fees live under "If something went wrong".
    setStep(variant === "visit" ? "confirm" : showLateFeePrompt ? "late_fee" : "confirm");
  }

  if (step === "late_fee" && braider) {
    return (
      <div className={`rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 ${className}`}>
        <p className="text-sm font-semibold text-emerald-950">
          Mark {booking.client_name}&apos;s service as complete?
        </p>
        <p className="mt-1 text-xs text-emerald-900/90">
          They arrived late today. What would you like to do about the{" "}
          {feeCents > 0 ? formatPrice(feeCents, braider.currency) : ""} late fee before closing out?
        </p>
        <LateFeeChoiceList
          clientName={booking.client_name}
          feeCents={feeCents}
          currency={braider.currency}
          showCharge={showChargeOption}
          disabled={loading}
          onChoose={(choice) => void handleLateFeeChoice(choice)}
          className="mt-4"
        />
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-emerald-950">Optional completion photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={loading}
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs text-stone-700 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setStep("idle");
              setError("");
            }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {chargeIssue && (
          <PolicyFeeChargeIssuePanel
            issue={chargeIssue}
            feeKind="late fee"
            clientId={booking.client_id}
            clientName={booking.client_name}
            clientEmail={booking.client_email}
            braiderId={braiderId}
            braider={braider}
            className="mt-3"
          />
        )}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className={`rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 ${className}`}>
        <p className="text-sm font-semibold text-emerald-950">
          Mark {booking.client_name}&apos;s service as complete?
        </p>
        <p className="mt-1 text-xs text-emerald-900/90">
          {promptBalancePayment
            ? "They'll be prompted to pay any remaining balance on My Bookings. A confirmation email is sent automatically."
            : "A confirmation email is sent automatically. This closes the appointment on your schedule."}
        </p>
        <label className="mt-3 block">
          <span className="text-xs font-semibold text-emerald-950">
            Optional completion photo (helps with disputes)
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs text-stone-700 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Yes, service is done"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setStep("idle");
              setError("");
            }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openFlow}
        className={
          variant === "visit"
            ? visitActionsPrimaryBtnComplete
            : variant === "mobile"
            ? bookingActionMobilePrimary
            : variant === "compact" || variant === "hero"
              ? bookingActionCompactPrimary
              : bookingActionBtnPrimaryOutline
        }
      >
        <CheckCircle2 className="h-4 w-4" />
        {variant === "visit" ? "Visit complete" : "Mark Service Complete"}
      </button>
      {note && <p className="mt-2 text-xs font-medium text-stone-700">{note}</p>}
    </div>
  );
}
