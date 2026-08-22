"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Clock, Trash2, UserX, Video } from "lucide-react";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { UncancelBookingButton } from "@/components/booking/uncancel-booking-button";
import { canUncancelBooking } from "@/lib/booking/uncancel";
import {
  visitActionsInlinePanel,
  visitActionsLinkBar,
  visitActionsLinkDanger,
  visitActionsLinkDivider,
  visitActionsPhaseLabel,
  visitActionsProblemLabel,
  visitActionsProblemList,
  visitActionsProblemRow,
  visitActionsProblemRowIcon,
  visitActionsProblemRowMuted,
  visitActionsProblemZone,
  visitActionsPrimaryBtnVideo,
  visitActionsRoot,
  visitActionsSummary,
} from "@/components/booking/booking-action-styles";
import { CompleteServiceButton } from "@/components/booking/complete-service-button";
import { ServiceCompletedStatus } from "@/components/booking/service-completed-status";
import { ConfirmDepositButton } from "@/components/booking/confirm-deposit-button";
import { DeleteBookingFromScheduleButton } from "@/components/booking/delete-booking-from-schedule-button";
import { LateArrivalProblemPanel } from "@/components/booking/late-arrival-problem-panel";
import { NoShowBookingButton } from "@/components/booking/no-show-booking-button";
import { NoShowFeeBookingActions } from "@/components/booking/no-show-fee-booking-actions";
import { RescheduleBookingButton } from "@/components/booking/reschedule-booking-button";
import { OfferSqueezeInButton } from "@/components/squeeze-in/offer-squeeze-in-button";
import { bookingNeedsSqueezeOfferAction } from "@/lib/squeeze-in/booking-flags";
import { bookingNeedsDepositConfirmation, consultationRoomPath } from "@/lib/booking";
import { canMarkServiceComplete } from "@/lib/booking/complete-service";
import {
  braiderLateArrivalToolAvailable,
  shouldShowLateFeeFollowUp,
} from "@/lib/booking/late-fee";
import { canMarkNoShow } from "@/lib/booking/no-show";
import { canShowNoShowFeeActions } from "@/lib/booking/no-show-fee";
import { canRemoveBookingFromSchedule } from "@/lib/booking/schedule-cleanup";
import { buildVisitPaymentSummary } from "@/lib/booking/visit-actions-summary";
import { cn } from "@/lib/utils";
import type { Booking, BraiderProfile } from "@/lib/types";

export type BraiderBookingActionsProps = {
  booking: Booking;
  slug: string;
  braiderId: string;
  braider?: BraiderProfile | null;
  braiderName: string;
  actorName: string;
  userId: string;
  currency?: string;
  isVideoConsultation?: boolean;
  roomPath?: string | false | null;
  onCancelled: (booking: Booking) => void;
  onRescheduled: (booking: Booking) => void;
  onDepositConfirmed: (booking: Booking) => void;
  onNoShowMarked: (booking: Booking) => void;
  onServiceCompleted: (booking: Booking) => void;
  onRemoved: (bookingId: string) => void;
  promptBalancePayment?: boolean;
  layout?: "desktop" | "mobile";
  className?: string;
};

function PhaseBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className={visitActionsPhaseLabel}>{label}</p>
      {children}
    </section>
  );
}

type ProblemAction = "late" | "no-show" | "remove";

function ProblemRow({
  label,
  icon,
  muted = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={muted ? visitActionsProblemRowMuted : visitActionsProblemRow}
        onClick={onClick}
      >
        <span className={visitActionsProblemRowIcon}>{icon}</span>
        {label}
      </button>
    </li>
  );
}

export function BraiderBookingActions({
  booking,
  slug,
  braiderId,
  braider,
  braiderName,
  actorName,
  userId,
  currency = "usd",
  isVideoConsultation = false,
  roomPath,
  onCancelled,
  onRescheduled,
  onDepositConfirmed,
  onNoShowMarked,
  onServiceCompleted,
  onRemoved,
  promptBalancePayment = false,
  layout = "desktop",
  className = "",
}: BraiderBookingActionsProps) {
  const [activeProblem, setActiveProblem] = useState<ProblemAction | null>(null);

  const cancelled = booking.status === "cancelled";
  const noShow = booking.status === "no_show";
  const completed = booking.status === "completed";
  const depositPending = bookingNeedsDepositConfirmation(booking);
  const showCompleteAction = canMarkServiceComplete(booking);
  const showNoShowAction = canMarkNoShow(booking);
  const showRemoveAction = canRemoveBookingFromSchedule(booking);
  const showActiveAppointmentActions = !cancelled && !noShow && !completed;

  const resolvedRoomPath =
    roomPath ?? (booking.room_id ? consultationRoomPath(slug, booking.room_id) : null);

  const paymentSummary = buildVisitPaymentSummary(booking, braider, currency);

  const lateToolAvailable =
    showActiveAppointmentActions &&
    Boolean(braider && !isVideoConsultation) &&
    braiderLateArrivalToolAvailable(braider, booking);

  const lateFollowUp =
    Boolean(braider && !isVideoConsultation) && shouldShowLateFeeFollowUp(braider, booking);

  const showNoShowFeeActions =
    Boolean(noShow && braider) && canShowNoShowFeeActions(braider, booking);

  const showSqueezeOffer =
    showActiveAppointmentActions &&
    bookingNeedsSqueezeOfferAction(booking) &&
    Boolean(booking.client_id && braider);

  const showProblemSection =
    showActiveAppointmentActions &&
    (lateToolAvailable || showNoShowAction || showSqueezeOffer || showRemoveAction);

  if (completed) {
    return (
      <div className={cn(visitActionsRoot, className)}>
        <ServiceCompletedStatus />
        {lateFollowUp && braider && (
          <LateArrivalProblemPanel
            booking={booking}
            braider={braider}
            braiderId={braiderId}
            currency={currency}
            followUp
            onUpdated={onNoShowMarked}
          />
        )}
        {showRemoveAction && (
          <DeleteBookingFromScheduleButton
            booking={booking}
            userId={userId}
            role="braider"
            braiderId={braiderId}
            onRemoved={onRemoved}
            variant="subtle"
          />
        )}
      </div>
    );
  }

  if (cancelled && canUncancelBooking(booking)) {
    return (
      <div className={cn(visitActionsRoot, className)}>
        <PhaseBlock label="Restore appointment">
          <p className={visitActionsSummary}>You can undo this cancellation for 15 minutes.</p>
          <UncancelBookingButton
            booking={booking}
            userId={userId}
            role="braider"
            braiderId={braiderId}
            braider={braider}
            onRestored={onCancelled}
            variant="compact"
          />
        </PhaseBlock>
        {showRemoveAction && (
          <DeleteBookingFromScheduleButton
            booking={booking}
            userId={userId}
            role="braider"
            braiderId={braiderId}
            onRemoved={onRemoved}
            variant="subtle"
          />
        )}
      </div>
    );
  }

  if (!showActiveAppointmentActions && !showNoShowFeeActions) {
    return null;
  }

  return (
    <div className={cn(visitActionsRoot, className)}>
      {depositPending && (
        <PhaseBlock label="Step 1 · Confirm deposit">
          {paymentSummary && <p className={visitActionsSummary}>{paymentSummary}</p>}
          <ConfirmDepositButton
            booking={booking}
            braiderId={braiderId}
            braider={braider}
            currency={currency}
            onConfirmed={onDepositConfirmed}
            variant="visit"
          />
        </PhaseBlock>
      )}

      {showCompleteAction && !depositPending && (
        <PhaseBlock label="Step 2 · After the visit">
          {paymentSummary && <p className={visitActionsSummary}>{paymentSummary}</p>}
          <CompleteServiceButton
            booking={booking}
            braiderId={braiderId}
            braider={braider}
            onCompleted={onServiceCompleted}
            promptBalancePayment={promptBalancePayment}
            variant="visit"
          />
        </PhaseBlock>
      )}

      {isVideoConsultation && resolvedRoomPath && showActiveAppointmentActions && (
        <PhaseBlock label="Video consultation">
          <Link href={`${resolvedRoomPath}?role=braider`} className={visitActionsPrimaryBtnVideo}>
            <Video className="h-4 w-4" aria-hidden />
            Start video call
          </Link>
        </PhaseBlock>
      )}

      {lateFollowUp && braider && (
        <div className={visitActionsInlinePanel}>
          <LateArrivalProblemPanel
            booking={booking}
            braider={braider}
            braiderId={braiderId}
            currency={currency}
            followUp
            onUpdated={onNoShowMarked}
          />
        </div>
      )}

      {showActiveAppointmentActions && (
        <div className={visitActionsLinkBar}>
          <RescheduleBookingButton
            booking={booking}
            userId={userId}
            role="braider"
            braiderId={braiderId}
            braiderName={braiderName}
            actorName={actorName}
            braider={braider}
            onRescheduled={onRescheduled}
            variant="link"
          />
          <span className={visitActionsLinkDivider} aria-hidden>
            ·
          </span>
          <CancelBookingButton
            booking={booking}
            userId={userId}
            role="braider"
            braiderId={braiderId}
            braiderName={braiderName}
            braider={braider}
            actorName={actorName}
            onCancelled={onCancelled}
            variant="link"
          />
        </div>
      )}

      {showNoShowFeeActions && braider && (
        <NoShowFeeBookingActions
          booking={booking}
          braider={braider}
          braiderId={braiderId}
          currency={currency}
          onUpdated={onNoShowMarked}
          compact
        />
      )}

      {showProblemSection && (
        <div className={visitActionsProblemZone}>
          <p className={visitActionsProblemLabel}>If something went wrong</p>

          {activeProblem === null && (
            <ul className={visitActionsProblemList}>
              {lateToolAvailable && !lateFollowUp && (
                <ProblemRow
                  label="Client arrived late"
                  icon={<Clock className="h-4 w-4" aria-hidden />}
                  onClick={() => setActiveProblem("late")}
                />
              )}

              {showNoShowAction && (
                <ProblemRow
                  label="Client didn't show"
                  icon={<UserX className="h-4 w-4" aria-hidden />}
                  onClick={() => setActiveProblem("no-show")}
                />
              )}

              {showSqueezeOffer && braider && booking.client_id && (
                <li>
                  <OfferSqueezeInButton
                    braider={braider}
                    clientId={booking.client_id}
                    clientName={booking.client_name}
                    variant="problem-row"
                  />
                </li>
              )}

              {showRemoveAction && !completed && (
                <ProblemRow
                  label="Remove from schedule"
                  icon={<Trash2 className="h-4 w-4" aria-hidden />}
                  muted
                  onClick={() => setActiveProblem("remove")}
                />
              )}
            </ul>
          )}

          {activeProblem === "late" && braider && (
            <div className={visitActionsInlinePanel}>
              <LateArrivalProblemPanel
                booking={booking}
                braider={braider}
                braiderId={braiderId}
                currency={currency}
                onUpdated={(updated) => {
                  onNoShowMarked(updated);
                  if (
                    updated.late_fee_status === "waived" ||
                    updated.late_fee_status === "charged" ||
                    updated.late_fee_status === "handled_outside"
                  ) {
                    setActiveProblem(null);
                  }
                }}
              />
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                onClick={() => setActiveProblem(null)}
              >
                Back
              </button>
            </div>
          )}

          {activeProblem === "no-show" && (
            <div className={visitActionsInlinePanel}>
              <NoShowBookingButton
                booking={booking}
                braiderId={braiderId}
                braider={braider}
                currency={currency}
                initialStep="confirm"
                onDismiss={() => setActiveProblem(null)}
                onMarked={({ booking: updated }) => {
                  onNoShowMarked(updated);
                  setActiveProblem(null);
                }}
                variant="compact"
              />
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                onClick={() => setActiveProblem(null)}
              >
                Back
              </button>
            </div>
          )}

          {activeProblem === "remove" && (
            <div className={visitActionsInlinePanel}>
              <DeleteBookingFromScheduleButton
                booking={booking}
                userId={userId}
                role="braider"
                braiderId={braiderId}
                initialConfirming
                onDismiss={() => setActiveProblem(null)}
                onRemoved={onRemoved}
                variant="compact"
              />
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                onClick={() => setActiveProblem(null)}
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
