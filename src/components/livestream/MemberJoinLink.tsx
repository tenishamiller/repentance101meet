"use client";

import { useCallback, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

type Props = {
  meetingToken: string;
  title?: string;
  /** hero = large admin panel; room = inside live meeting; row = compact in list */
  variant?: "hero" | "room" | "row";
};

export function MemberJoinLink({
  meetingToken,
  title = "Member Join Link",
  variant = "room",
}: Props) {
  const [copied, setCopied] = useState(false);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/meeting/${meetingToken}`
      : `/meeting/${meetingToken}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked */
    }
  }, [joinUrl]);

  if (variant === "hero") {
    return (
      <div className="hero-brand rounded-2xl border-2 border-gold/50 p-6 text-cream shadow-lg">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-gold" />
          <h3 className="font-serif text-xl font-bold">{title}</h3>
        </div>
        <p className="mb-4 text-sm text-gold-light/90">
          Send this private link to approved members. They log in, then join your live teaching.
        </p>
        <code className="block break-all rounded-xl border border-gold/30 bg-burgundy-deep/60 px-4 py-3 text-sm text-gold-light">
          {joinUrl}
        </code>
        <button
          type="button"
          onClick={copyLink}
          className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 !py-3"
        >
          {copied ? (
            <>
              <Check className="h-5 w-5" />
              Copied — paste to members!
            </>
          ) : (
            <>
              <Copy className="h-5 w-5" />
              Copy Member Link
            </>
          )}
        </button>
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className="mt-3 rounded-xl border border-gold/30 bg-cream-dark p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-burgundy">
          Member link
        </p>
        <code className="mt-1 block break-all text-xs text-burgundy/80">{joinUrl}</code>
        <button
          type="button"
          onClick={copyLink}
          className="mt-2 text-sm font-semibold text-gold-muted hover:underline"
        >
          {copied ? "Copied!" : "Copy link for members"}
        </button>
      </div>
    );
  }

  /* room — Norman sees this while broadcasting */
  return (
    <div className="mb-4 rounded-xl border-2 border-gold/50 bg-gradient-to-br from-burgundy to-burgundy-dark p-4 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-serif text-sm font-bold text-gold">
            <Link2 className="h-4 w-4" />
            Share With Members
          </p>
          <p className="mt-1 text-xs text-gold-light/80">
            Copy this link — only approved members can enter
          </p>
        </div>
      </div>
      <code className="mt-2 block break-all rounded-lg border border-gold/20 bg-burgundy-deep/80 px-3 py-2 text-xs text-cream">
        {joinUrl}
      </code>
      <button
        type="button"
        onClick={copyLink}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-bold text-burgundy-deep transition hover:bg-gold-light"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Link Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy Member Join Link
          </>
        )}
      </button>
    </div>
  );
}
