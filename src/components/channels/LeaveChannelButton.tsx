"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAppPath } from "@/hooks/useAppBase";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  channelName: string;
  /** header = channel room; card = dashboard list */
  variant?: "header" | "card";
};

export function LeaveChannelButton({ slug, channelName, variant = "header" }: Props) {
  const router = useRouter();
  const dashboardPath = useAppPath("/dashboard");
  const [leaving, setLeaving] = useState(false);

  async function leaveChannel() {
    if (leaving) return;
    const confirmed = window.confirm(
      `Leave ${channelName}? You will need to request access again if you want to rejoin.`,
    );
    if (!confirmed) return;

    setLeaving(true);
    try {
      const res = await fetch(`/api/channels/${slug}/join`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(typeof data.error === "string" ? data.error : "Could not leave this channel.");
        return;
      }
      if (variant === "card") {
        router.refresh();
        return;
      }
      router.push(dashboardPath);
    } catch {
      window.alert("Could not leave this channel.");
    } finally {
      setLeaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void leaveChannel()}
      disabled={leaving}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition disabled:opacity-60",
        variant === "header"
          ? "rounded-lg border border-burgundy/25 bg-cream px-2.5 py-1.5 text-xs text-burgundy/80 hover:border-burgundy/40 hover:bg-burgundy/5 hover:text-burgundy sm:px-3 sm:text-sm"
          : "mt-3 text-sm text-burgundy/65 hover:text-burgundy hover:underline",
      )}
    >
      <LogOut className="h-3.5 w-3.5" />
      {leaving ? "Leaving..." : "Leave Channel"}
    </button>
  );
}
