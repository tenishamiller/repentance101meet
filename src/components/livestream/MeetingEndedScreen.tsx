"use client";

import Link from "next/link";
import { BrandDivider } from "@/components/BrandDivider";
import { BrandSeal } from "@/components/BrandSeal";
import { Heart } from "lucide-react";

export type RecordingSaveStatus =
  | "uploading"
  | "saved"
  | "upload-failed"
  | "empty"
  | "not-recorded";

type Props = {
  meetingTitle: string;
  variant: "host" | "viewer";
  recordingSaveStatus?: RecordingSaveStatus | null;
  onContinue?: () => void;
};

export function MeetingEndedScreen({
  meetingTitle,
  variant,
  recordingSaveStatus,
  onContinue,
}: Props) {
  const isHost = variant === "host";

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center bg-burgundy-deep px-4 py-12 text-center">
      <BrandSeal size={120} inverted className="mx-auto" />

      <h1 className="mt-6 font-serif text-3xl font-bold text-cream md:text-4xl">
        {isHost ? "Meeting Ended" : "Thanks for Joining"}
      </h1>
      <BrandDivider light className="mx-auto my-4 max-w-xs" />

      <p className="max-w-md text-lg text-gold-light/90">
        {isHost ? (
          <>
            <strong className="text-cream">{meetingTitle}</strong> has ended. The livestream is closed
            for everyone.
          </>
        ) : (
          <>
            Thank you for worshipping and learning with us during{" "}
            <strong className="text-cream">{meetingTitle}</strong>. We&apos;re grateful you
            joined the livestream.
          </>
        )}
      </p>

      {!isHost && (
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-gold-light/70">
          <Heart className="h-4 w-4 text-gold" />
          See you at the next teaching session
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {onContinue ? (
          <button type="button" onClick={onContinue} className="btn-primary !px-6 !py-3">
            {isHost ? "Back to Admin Console" : "Back to Livestream"}
          </button>
        ) : (
          <Link
            href={isHost ? "/admin" : "/livestream"}
            className="btn-primary inline-flex !px-6 !py-3"
          >
            {isHost ? "Back to Admin Console" : "Back to Livestream"}
          </Link>
        )}
        {!isHost && (
          <Link href="/dashboard" className="btn-secondary inline-flex !px-6 !py-3">
            Go to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
