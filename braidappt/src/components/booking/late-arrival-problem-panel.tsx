"use client";

import { useState, type ReactNode } from "react";
import { Ban, Clock, CreditCard, HandCoins } from "lucide-react";
import { chargeBookingLateFee, updateBookingLateFeeStatus } from "@/lib/booking";
import {
  bookingGraceMinutes,
  bookingLateFeeCents,
  canChargeLateFee,
  canShowLateFeeActions,
  lateFeeStatusLabel,
} from "@/lib/booking/late-fee";
import { braiderStripeConnectReady } from "@/lib/stripe/connect";
import { formatPrice } from "@/lib/utils";
import {
  visitActionsProblemList,
  visitActionsProblemRow,
  visitActionsProblemRowDesc,
  visitActionsProblemRowIcon,
  visitActionsProblemRowStack,
  visitActionsProblemRowTitle,
} from "@/components/booking/booking-action-styles";
import {
  PolicyFeeChargeIssuePanel,
  resolvePolicyFeeChargeIssue,
  type PolicyFeeChargeIssue,
} from "@/components/booking/policy-fee-charge-issue-panel";
import type { Booking, BraiderProfile } from "@/lib/types";

type Props = {
  booking: Booking;
  braider: BraiderProfile;
  braiderId: string;
  currency?: string;
  onUpdated: (booking: Booking) => void;
  /** After late is already recorded — charge or waive only. */
  followUp?: boolean;
  className?: string;
};

type Step = "menu" | "confirm-record" | "confirm-charge" | "confirm-waive" | "confirm-outside";

function ChoiceRow({
  icon,
  title,
  description,
  onClick,
  iconClassName = "text-stone-500",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  iconClassName?: string;
}) {
  return (
    <li>
      <button type="button" className={visitActionsProblemRow} onClick={onClick}>
        <span className={`${visitActionsProblemRowIcon} ${iconClassName}`}>{icon}</span>
        <span className={visitActionsProblemRowStack}>
          <span className={visitActionsProblemRowTitle}>{title}</span>
          <span className={visitActionsProblemRowDesc}>{description}</span>
        </span>
      </button>
    </li>
  );
}

function ConfirmScreen({
  title,
  body,
  confirmLabel,
  loading,
  error,
  onConfirm,
  onBack,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{body}</p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={onConfirm}
        className="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
      >
        {loading ? "Saving…" : confirmLabel}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onBack}
        className="w-full py-2 text-sm font-medium text-stone-500 transition hover:text-stone-800"
      >
        Go back
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function LateArrivalProblemPanel({
  booking,
  braider,
  braiderId,
  currency = "usd",
  onUpdated,
  followUp = false,
  className = "",
}: Props) {
  const [step, setStep] = useState<Step>("menu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chargeIssue, setChargeIssue] = useState<PolicyFeeChargeIssue | null>(null);

  const feeCents = bookingLateFeeCents(braider, booking);
  const graceMinutes = bookingGraceMinutes(braider, booking);
  const feeLabel = feeCents > 0 ? formatPrice(feeCents, currency) : null;
  const showCharge =
    canChargeLateFee(braider, booking) && braiderStripeConnectReady(braider) && feeCents > 0;
  const showMenu = canShowLateFeeActions(braider, booking) || followUp;
  const alreadyMarked = booking.late_fee_status === "marked_late" || followUp;
  const statusLabel = lateFeeStatusLabel(booking.late_fee_status, feeCents, currency);

  if (booking.late_fee_payment_pending && booking.late_fee_status !== "charged") {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-violet-900">
          Waiting on {feeLabel ?? "late fee"} payment from {booking.client_name}.
        </p>
        {showCharge && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setStep("confirm-charge")}
            className="mt-3 w-full rounded-xl border border-stone-200 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
          >
            Resend payment link
          </button>
        )}
      </div>
    );
  }

  if (
    booking.late_fee_status === "waived" ||
    booking.late_fee_status === "charged" ||
    booking.late_fee_status === "handled_outside"
  ) {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-stone-700">{statusLabel}</p>
      </div>
    );
  }

  if (chargeIssue && step === "menu") {
    return (
      <div className={className}>
        <PolicyFeeChargeIssuePanel
          issue={chargeIssue}
          feeKind="late fee"
          clientId={booking.client_id}
          clientName={booking.client_name}
          clientEmail={booking.client_email}
          braiderId={braiderId}
          braider={braider}
        />
      </div>
    );
  }

  async function applyStatus(status: "marked_late" | "waived" | "handled_outside") {
    setLoading(true);
    setError("");
    try {
      const updated = await updateBookingLateFeeStatus(booking.id, braiderId, status);
      onUpdated(updated);
      setStep("menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  async function applyCharge() {
    setLoading(true);
    setError("");
    try {
      const result = await chargeBookingLateFee(booking.id, braiderId, feeCents);
      onUpdated(result.booking);
      if (result.mode !== "charged") {
        setChargeIssue(resolvePolicyFeeChargeIssue(result));
      } else {
        setChargeIssue(null);
      }
      setStep("menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not charge late fee");
    } finally {
      setLoading(false);
    }
  }

  if (step === "confirm-record") {
    return (
      <ConfirmScreen
        title={`Note that ${booking.client_name} arrived late?`}
        body={
          graceMinutes > 0
            ? `This logs lateness after your ${graceMinutes}-minute grace period. No fee is charged yet — you can decide that next.`
            : "This logs the late arrival on the appointment. No fee is charged yet."
        }
        confirmLabel="Yes, record late arrival"
        loading={loading}
        error={error}
        onConfirm={() => void applyStatus("marked_late")}
        onBack={() => {
          setStep("menu");
          setError("");
        }}
      />
    );
  }

  if (step === "confirm-charge") {
    return (
      <ConfirmScreen
        title={`Charge ${feeLabel} late fee?`}
        body={`${booking.client_name} agreed to this at booking. Their card on file is charged when available, otherwise they get a payment link.`}
        confirmLabel={`Charge ${feeLabel}`}
        loading={loading}
        error={error}
        onConfirm={() => void applyCharge()}
        onBack={() => {
          setStep("menu");
          setError("");
        }}
      />
    );
  }

  if (step === "confirm-waive") {
    return (
      <ConfirmScreen
        title={`Waive the late fee for ${booking.client_name}?`}
        body={
          feeLabel
            ? `You're skipping the ${feeLabel} fee this time. It's still noted on the appointment.`
            : "You're skipping the late fee this time. It's still noted on the appointment."
        }
        confirmLabel="Waive fee"
        loading={loading}
        error={error}
        onConfirm={() => void applyStatus("waived")}
        onBack={() => {
          setStep("menu");
          setError("");
        }}
      />
    );
  }

  if (step === "confirm-outside") {
    return (
      <ConfirmScreen
        title="Mark fee as collected outside the app?"
        body="Use this when you already got cash, Venmo, or another off-app payment. For your records only."
        confirmLabel="Yes, already collected"
        loading={loading}
        error={error}
        onConfirm={() => void applyStatus("handled_outside")}
        onBack={() => {
          setStep("menu");
          setError("");
        }}
      />
    );
  }

  if (!showMenu) {
    return null;
  }

  return (
    <div className={className}>
      <p className="mb-3 text-xs leading-relaxed text-stone-500">
        {alreadyMarked
          ? `Late arrival recorded${feeLabel ? ` · policy fee ${feeLabel}` : ""}. Choose what to do about the fee.`
          : feeLabel
            ? `Policy fee ${feeLabel}${graceMinutes > 0 ? ` · ${graceMinutes}-min grace` : ""}. Pick one — nothing happens until you confirm.`
            : "Pick one — nothing is charged until you confirm."}
      </p>

      <ul className={visitActionsProblemList}>
        {!alreadyMarked && (
          <ChoiceRow
            icon={<Clock className="h-4 w-4" aria-hidden />}
            iconClassName="text-amber-600"
            title="Record late arrival"
            description="Log it now — decide on the fee after"
            onClick={() => {
              setError("");
              setStep("confirm-record");
            }}
          />
        )}

        {showCharge && (
          <ChoiceRow
            icon={<CreditCard className="h-4 w-4" aria-hidden />}
            iconClassName="text-violet-600"
            title={feeLabel ? `Charge ${feeLabel}` : "Charge late fee"}
            description="Bill their card on file or send a link"
            onClick={() => {
              setError("");
              setStep("confirm-charge");
            }}
          />
        )}

        <ChoiceRow
          icon={<Ban className="h-4 w-4" aria-hidden />}
          title="Waive the fee"
          description="No charge this visit"
          onClick={() => {
            setError("");
            setStep("confirm-waive");
          }}
        />

        <ChoiceRow
          icon={<HandCoins className="h-4 w-4" aria-hidden />}
          title="Already collected"
          description="Cash, Venmo, or paid you directly"
          onClick={() => {
            setError("");
            setStep("confirm-outside");
          }}
        />
      </ul>
    </div>
  );
}
