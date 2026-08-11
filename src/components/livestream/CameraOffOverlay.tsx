"use client";

import { UserAvatar } from "@/components/UserAvatar";
import type { AvatarSize } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  compact?: boolean;
  /** Member self-view PiP — fill the circular tile with the avatar. */
  pipLayout?: boolean;
  /** When false, only the avatar is shown (name row handles the label). */
  showName?: boolean;
  className?: string;
};

export function CameraOffOverlay({
  userId,
  name,
  avatarUrl,
  size,
  compact = false,
  pipLayout = false,
  showName,
  className,
}: Props) {
  const resolvedSize = size ?? (pipLayout ? "xl" : compact ? "xl" : "2xl");
  const showLabel = showName ?? !compact;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex flex-col items-center justify-center bg-burgundy-deep",
        pipLayout ? "px-0" : "px-4",
        className,
      )}
    >
      <UserAvatar
        userId={userId}
        name={name}
        avatarUrl={avatarUrl}
        size={resolvedSize}
        interactive={false}
        loadProfileWhenEmpty
        onDark
        imageFit={pipLayout ? "contain" : "cover"}
        className={cn(
          "ring-gold/50",
          pipLayout &&
            "!h-[5.25rem] !w-[5.25rem] !text-xl md:!h-[7.25rem] md:!w-[7.25rem] md:!text-2xl",
        )}
      />
      {showLabel && (
        <>
          <p
            className={cn(
              "mt-3 text-center font-serif font-semibold text-cream",
              compact ? "text-sm" : "text-lg sm:text-xl",
            )}
          >
            {name}
          </p>
          {!compact && <p className="mt-1 text-sm text-gold-light/70">Camera off</p>}
        </>
      )}
    </div>
  );
}

export function VideoLoadingOverlay({ label = "Starting camera…" }: { label?: string }) {
  return (
    <div className="absolute inset-0 z-[1] flex items-center justify-center bg-burgundy-deep/95">
      <p className="font-serif text-gold-light">{label}</p>
    </div>
  );
}
