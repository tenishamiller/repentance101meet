"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { SqueezeInOfferDialog } from "@/components/squeeze-in/squeeze-in-offer-dialog";
import { platformClasses } from "@/lib/brand/platform-theme";
import {
  visitActionsProblemRow,
  visitActionsProblemRowIcon,
} from "@/components/booking/booking-action-styles";
import type { BraiderProfile } from "@/lib/types";

type Props = {
  braider: BraiderProfile;
  clientId: string;
  clientName: string;
  className?: string;
  variant?: "default" | "problem-row";
  onSent?: (conversationId: string | null) => void;
};

export function OfferSqueezeInButton({
  braider,
  clientId,
  clientName,
  className,
  variant = "default",
  onSent,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (braider.squeeze_in_enabled !== true || !clientId) return null;

  function handleSent(conversationId: string | null) {
    onSent?.(conversationId);
    if (conversationId) {
      router.push(`/dashboard/messages?c=${conversationId}`);
    } else {
      router.push("/dashboard/messages");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "problem-row"
            ? visitActionsProblemRow
            : `flex items-center justify-center gap-2 ${platformClasses.pillBtnOutline} ${className ?? ""}`
        }
      >
        {variant === "problem-row" ? (
          <>
            <span className={visitActionsProblemRowIcon}>
              <Zap className="h-4 w-4" aria-hidden />
            </span>
            Offer earlier slot
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Offer squeeze-in
          </>
        )}
      </button>
      <SqueezeInOfferDialog
        open={open}
        onClose={() => setOpen(false)}
        braider={braider}
        clientId={clientId}
        clientName={clientName}
        onSent={handleSent}
      />
    </>
  );
}
