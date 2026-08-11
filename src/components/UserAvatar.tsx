"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/AvatarImage";
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
}: UserAvatarProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (interactive || (!loadProfileWhenEmpty && avatarUrl)) return;

    let cancelled = false;
    setProfileLoading(true);

    fetch(`/api/users/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) {
          setProfile(data.user);
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [avatarUrl, interactive, loadProfileWhenEmpty, userId]);

  useEffect(() => {
    if (!showPopover) {
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    fetch(`/api/users/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) {
          setProfile(data.user);
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showPopover, userId]);

  const displayName = profile?.name ?? name;
  const displayAvatarUrl = resolveAvatarUrl(profile?.avatarUrl ?? avatarUrl);
  const showImage = displayAvatarUrl && !imageFailed;

  const face = (
    <>
      {showImage ? (
        <AvatarImage
          src={displayAvatarUrl}
          alt={displayName}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center font-semibold",
            onDark ? "bg-burgundy/40 text-cream" : "bg-burgundy/10 text-burgundy",
          )}
        >
          {getInitials(displayName)}
        </span>
      )}
    </>
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
            {profileLoading ? (
              <p className="mt-2 text-center text-xs text-burgundy/45">Loading profile…</p>
            ) : profile ? (
              <p className="mt-2 text-center text-xs text-burgundy/60">
                Member since {formatMemberSince(profile.createdAt)}
              </p>
            ) : null}
            <Link
              href={`/profile/${userId}`}
              className="mt-3 block text-center text-sm text-gold-muted hover:underline"
              onClick={() => setShowPopover(false)}
            >
              View Profile
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
