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
  /** Sidebar tile — short Zoom-style box; avatar scaled to fit without cropping the head. */
  panelLayout?: boolean;
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
  panelLayout = false,
  showName,
  className,
}: Props) {
  const resolvedSize = size ?? (panelLayout ? "lg" : compact ? "xl" : "2xl");
  const showLabel = showName ?? (!compact && !panelLayout);

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex flex-col items-center justify-center bg-burgundy-deep",
        panelLayout ? "px-2 py-1" : "px-4",
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
        imageFit="contain"
        className={cn(
          "shrink-0 ring-gold/50",
          panelLayout
            ? "aspect-square h-auto w-auto max-h-[68%] max-w-[68%] min-h-0"
            : "max-h-full max-w-full",
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
