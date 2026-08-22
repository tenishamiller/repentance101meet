"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { removeBookingFromSchedule } from "@/lib/booking";
import {
  canRemoveBookingFromSchedule,
  removeBookingFromScheduleBlockedReason,
} from "@/lib/booking/schedule-cleanup";
import {
  bookingActionBtnNeutral,
  bookingActionBtnSubtle,
  bookingActionCompactBtn,
  bookingActionMobileBtn,
  bookingScheduleToolbarBtn,
  bookingScheduleToolbarBtnIcon,
  bookingScheduleToolbarBtnLabel,
  visitActionsProblemRowMuted,
  visitActionsProblemRowIcon,
} from "@/components/booking/booking-action-styles";
import type { Booking } from "@/lib/types";

type Props = {
  booking: Booking;
  userId: string;
  role: "client" | "braider";
  braiderId?: string;
  onRemoved: (bookingId: string) => void;
  className?: string;
  variant?: "default" | "compact" | "subtle" | "compact-grid" | "mobile" | "schedule-toolbar" | "link" | "problem-row";
  /** Opens directly on the confirm step (e.g. problem-section panel). */
  initialConfirming?: boolean;
  onDismiss?: () => void;
};

export function DeleteBookingFromScheduleButton({
  booking,
  userId,
  role,
  braiderId,
  onRemoved,
  className = "",
  variant = "default",
  initialConfirming = false,
  onDismiss,
}: Props) {
  const [confirming, setConfirming] = useState(initialConfirming);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const blockedReason = removeBookingFromScheduleBlockedReason(booking);
  if (!canRemoveBookingFromSchedule(booking)) {
    return blockedReason ? (
      <p className={`text-xs text-stone-500 ${className}`}>{blockedReason}</p>
    ) : null;
  }

  async function handleDelete() {
    setError("");
    setLoading(true);
    try {
      await removeBookingFromSchedule(booking.id, userId, role, braiderId);
      onRemoved(booking.id);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete booking");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div
        className={`rounded-xl border border-red-200/80 bg-red-50/40 p-3 shadow-sm ${className}`}
      >
        <p className="text-sm font-semibold text-red-950">Delete Permanently?</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">
          This will permanently remove this booking from your schedule. It cannot be undone or
          restored from your account.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleDelete()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Yes, Delete Permanently"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setConfirming(false);
              setError("");
              onDismiss?.();
            }}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
          >
            Keep Booking
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const trigger = (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={
          variant === "problem-row"
            ? visitActionsProblemRowMuted
            : variant === "link"
            ? "rounded-lg px-1 py-2 text-left text-sm font-medium text-stone-500 transition hover:text-stone-700"
            : variant === "schedule-toolbar"
            ? `${bookingScheduleToolbarBtn} hover:border-stone-300 hover:bg-stone-50`
            : variant === "mobile"
            ? `${bookingActionMobileBtn} border-stone-200 bg-white text-stone-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`
            : variant === "compact-grid"
              ? `${bookingActionCompactBtn} border-stone-200 bg-stone-50 text-stone-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`
              : variant === "subtle"
                ? bookingActionBtnSubtle
                : variant === "compact"
                  ? `${bookingActionBtnNeutral} hover:border-red-200 hover:bg-red-50/50 hover:text-red-700`
                  : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-2 text-sm font-semibold text-stone-600 transition hover:border-red-200 hover:bg-red-50/50 hover:text-red-700"
        }
      >
        {variant === "problem-row" ? (
          <>
            <span className={visitActionsProblemRowIcon}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </span>
            Remove from schedule
          </>
        ) : variant === "link" ? (
          "Remove from schedule"
        ) : variant === "schedule-toolbar" ? (
          <>
            <span className={bookingScheduleToolbarBtnIcon}>
              <Trash2 className="h-4 w-4" />
            </span>
            <span className={bookingScheduleToolbarBtnLabel}>Remove</span>
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            {variant === "compact-grid" ? "Remove" : variant === "mobile" ? "Remove from Schedule" : "Remove from schedule"}
          </>
        )}
      </button>
  );

  if (variant === "problem-row") {
    return trigger;
  }

  return <div className={className}>{trigger}</div>;
}
