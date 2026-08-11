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
  const resolvedSize = size ?? (pipLayout ? "xl" : compact ? "lg" : "2xl");
  const showLabel = showName ?? !compact;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden bg-burgundy-deep px-2 py-2 sm:gap-2 sm:px-4 sm:py-3",
        pipLayout && "px-0 py-0 sm:px-0 sm:py-0",
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
            "!h-[4rem] !w-[4rem] !text-lg sm:!h-[5.25rem] sm:!w-[5.25rem] sm:!text-xl md:!h-[7.25rem] md:!w-[7.25rem] md:!text-2xl",
          !pipLayout &&
            !size &&
            (compact
              ? "!h-10 !w-10 !text-xs sm:!h-16 sm:!w-16 sm:!text-lg"
              : "!h-14 !w-14 !text-sm sm:!h-20 sm:!w-20 sm:!text-lg md:!h-24 md:!w-24 md:!text-xl lg:!h-32 lg:!w-32 lg:!text-3xl"),
        )}
      />
      {showLabel && (
        <>
          <p
            className={cn(
              "max-w-full truncate px-1 text-center font-serif font-semibold text-cream",
              compact ? "text-[11px] sm:text-sm" : "text-xs sm:text-base md:text-lg lg:text-xl",
            )}
          >
            {name}
          </p>
          {!compact && (
            <p className="text-[10px] text-gold-light/70 sm:text-sm">Camera off</p>
          )}
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
