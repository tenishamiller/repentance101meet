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
  className?: string;
};

export function CameraOffOverlay({
  userId,
  name,
  avatarUrl,
  size = "2xl",
  compact = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex flex-col items-center justify-center bg-burgundy px-4",
        className,
      )}
    >
      <UserAvatar
        userId={userId}
        name={name}
        avatarUrl={avatarUrl}
        size={compact ? "lg" : size}
        interactive={false}
        className="ring-gold/50"
      />
      <p
        className={cn(
          "mt-3 text-center font-serif font-semibold text-cream",
          compact ? "text-sm" : "text-lg sm:text-xl",
        )}
      >
        {name}
      </p>
      {!compact && <p className="mt-1 text-sm text-gold-light/70">Camera off</p>}
    </div>
  );
}
