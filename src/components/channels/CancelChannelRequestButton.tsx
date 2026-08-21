"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  channelName: string;
  variant?: "page" | "card";
  onCancelled?: () => void;
};

export function CancelChannelRequestButton({
  slug,
  channelName,
  variant = "page",
  onCancelled,
}: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  async function cancelRequest() {
    if (cancelling) return;
    const confirmed = window.confirm(
      `Cancel your request to join ${channelName}? You can request again later.`,
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/channels/${slug}/join`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(
          typeof data.error === "string" ? data.error : "Could not cancel this request.",
        );
        return;
      }
      onCancelled?.();
      if (variant === "card") {
        router.refresh();
      }
    } catch {
      window.alert("Could not cancel this request.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void cancelRequest()}
      disabled={cancelling}
      className={cn(
        "font-semibold transition disabled:opacity-60",
        variant === "page"
          ? "btn-secondary mt-4 w-full sm:w-auto"
          : "mt-3 text-sm text-burgundy/70 hover:text-burgundy hover:underline",
      )}
    >
      {cancelling ? "Cancelling..." : "Cancel Request"}
    </button>
  );
}
