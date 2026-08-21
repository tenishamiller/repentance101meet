"use client";

import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/AvatarImage";
import { AppPathLink } from "@/components/AppPathLink";
import { MINISTRY_NAME } from "@/lib/brand";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { cn, formatMemberSince, getInitials } from "@/lib/utils";

export type AvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

type PublicProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
};

type UserAvatarProps = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  /** When false, shows avatar only (no profile popover). */
  interactive?: boolean;
  /** Load profile photo from API when no avatarUrl prop is provided. */
  loadProfileWhenEmpty?: boolean;
  /** Use light initials/text on dark video panels. */
  onDark?: boolean;
  /** Show full face in circular tiles without cropping the top of the head. */
  imageFit?: "cover" | "contain";
};

const sizes: Record<AvatarSize, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-xl",
  "2xl": "h-32 w-32 text-3xl",
};

export function UserAvatar({
  userId,
  name,
  avatarUrl,
  size = "md",
  className,
  interactive = true,
  loadProfileWhenEmpty = false,
  onDark = false,
  imageFit = "cover",
}: UserAvatarProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    // Don't block the photo on an extra round-trip when the URL is already known.
    if (avatarUrl) return;
    if (interactive && !loadProfileWhenEmpty) return;

    let cancelled = false;

    fetch(`/api/users/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) {
          setProfile(data.user);
        }
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [avatarUrl, interactive, loadProfileWhenEmpty, userId]);

  useEffect(() => {
    if (!showPopover) {
      return;
    }

    let cancelled = false;

    fetch(`/api/users/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) {
          setProfile(data.user);
        }
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [showPopover, userId]);

  const displayName = profile?.name ?? name;
  const displayAvatarUrl = resolveAvatarUrl(profile?.avatarUrl ?? avatarUrl);
  const imageFailed = Boolean(displayAvatarUrl && failedUrl === displayAvatarUrl);
  const imageLoaded = Boolean(displayAvatarUrl && loadedUrl === displayAvatarUrl);

  const initials = (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center font-semibold",
        onDark ? "bg-burgundy/40 text-cream" : "bg-burgundy/10 text-burgundy",
      )}
    >
      {getInitials(displayName)}
    </span>
  );

  const face = displayAvatarUrl && !imageFailed ? (
    <>
      <span className={cn("absolute inset-0", imageLoaded && "opacity-0")}>{initials}</span>
      <AvatarImage
        src={displayAvatarUrl}
        alt={displayName}
        className={cn(
          "site-brand-img relative h-full w-full",
          imageFit === "contain" ? "object-contain" : "object-cover",
        )}
        onLoad={() => setLoadedUrl(displayAvatarUrl)}
        onError={() => setFailedUrl(displayAvatarUrl)}
      />
    </>
  ) : (
    initials
  );

  if (!interactive) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full ring-2 ring-gold/40",
          sizes[size],
          className,
        )}
        title={displayName}
      >
        {face}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowPopover((v) => !v)}
        className={cn(
          "relative overflow-hidden rounded-full bg-burgundy/10 font-semibold text-burgundy ring-2 ring-gold/40 transition hover:ring-gold",
          sizes[size],
          className,
        )}
        title={displayName}
        aria-expanded={showPopover}
        aria-haspopup="dialog"
      >
        {face}
      </button>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-gold/30 bg-cream p-4 shadow-lg">
            <div className="mb-3 flex justify-center">
              <UserAvatar
                userId={userId}
                name={displayName}
                avatarUrl={displayAvatarUrl}
                size="xl"
                interactive={false}
              />
            </div>
            <p className="text-center font-serif font-semibold text-burgundy">{displayName}</p>
            {profile?.role === "ADMIN" && (
              <p className="mt-1 text-center text-xs font-medium text-gold-muted">
                Teacher — {MINISTRY_NAME}
              </p>
            )}
            {profile ? (
              <p className="mt-2 text-center text-xs text-burgundy/60">
                Member since {formatMemberSince(profile.createdAt)}
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-burgundy/45">Loading profile…</p>
            )}
            <AppPathLink
              href={`/profile/${userId}`}
              className="mt-3 block text-center text-sm text-gold-muted hover:underline"
              onClick={() => setShowPopover(false)}
            >
              View Profile
            </AppPathLink>
          </div>
        </>
      )}
    </div>
  );
}
