"use client";

import Link from "next/link";
import Image from "next/image";
import { BrandDivider } from "@/components/BrandDivider";
import { Heart } from "lucide-react";

export type RecordingSaveStatus = "saved" | "upload-failed" | "empty" | "not-recorded";

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
      <Image
        src="/brand/repentance101-logo.png"
        alt="Repentance 101"
        width={120}
        height={120}
        className="seal-ring rounded-full ring-offset-burgundy-deep"
      />

      <h1 className="mt-6 font-serif text-3xl font-bold text-cream md:text-4xl">
        {isHost ? "Meeting Ended" : "Thanks for Joining"}
      </h1>
      <BrandDivider light className="mx-auto my-4 max-w-xs" />

      <p className="max-w-md text-lg text-gold-light/90">
        {isHost ? (
          <>
            <strong className="text-cream">{meetingTitle}</strong> has ended.{" "}
            {recordingSaveStatus === "saved" ? (
              <>
                Your recording was saved to the Recording Library. Download it anytime from Admin →
                Livestream.
              </>
            ) : recordingSaveStatus === "upload-failed" ? (
              <>
                The recording could not be saved to the library — check Admin → Recording Library or
                verify Supabase storage, then try recording again next session.
              </>
            ) : recordingSaveStatus === "empty" ? (
              <>
                Recording was too short to save. Next time, record for at least a few seconds before
                ending the livestream.
              </>
            ) : recordingSaveStatus === "not-recorded" ? (
              <>
                No recording was saved because Record was not used. Click{" "}
                <strong className="text-cream">Record</strong> during a session to add it to your
                library when you end the livestream.
              </>
            ) : (
              <>The livestream has ended for everyone.</>
            )}
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
