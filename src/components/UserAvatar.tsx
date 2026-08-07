"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";

type UserAvatarProps = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

const pixelSizes = { sm: 32, md: 40, lg: 64 };

export function UserAvatar({
  userId,
  name,
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const [showPopover, setShowPopover] = useState(false);

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
        title={name}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={pixelSizes[size]}
            height={pixelSizes[size]}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {getInitials(name)}
          </span>
        )}
      </button>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border border-gold/30 bg-cream p-4 shadow-lg">
            <div className="mb-3 flex justify-center">
              <div
                className={cn(
                  "overflow-hidden rounded-full bg-burgundy/10 ring-2 ring-gold/40",
                  sizes.lg,
                )}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-burgundy">
                    {getInitials(name)}
                  </span>
                )}
              </div>
            </div>
            <p className="text-center font-serif font-semibold text-burgundy">{name}</p>
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
