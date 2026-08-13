"use client";

import Link from "next/link";
import Image from "next/image";
import { BrandDivider } from "@/components/BrandDivider";
import { MINISTRY_LEADER } from "@/lib/brand";
import { useAppPath } from "@/hooks/useAppBase";

type Props = {
  meetingTitle?: string;
  onContinue?: () => void;
};

export function RemovedFromMeetingScreen({ meetingTitle, onContinue }: Props) {
  const livestreamPath = useAppPath("/livestream");
  const dashboardPath = useAppPath("/dashboard");

  return (
    <div className="livestream-room flex min-h-[calc(100vh-80px)] flex-col items-center justify-center bg-burgundy-deep px-4 py-12 text-center">
      <Image
        src="/brand/repentance101-logo.png"
        alt="Repentance 101"
        width={120}
        height={120}
        className="seal-ring rounded-full ring-offset-burgundy-deep"
      />

      <h1 className="mt-6 font-serif text-3xl font-bold text-cream md:text-4xl">
        You were removed from the livestream
      </h1>
      <BrandDivider light className="mx-auto my-4 max-w-xs" />

      <p className="max-w-md text-lg text-gold-light/90">
        {meetingTitle ? (
          <>
            The host removed you from <strong className="text-cream">{meetingTitle}</strong>.
          </>
        ) : (
          <>The host removed you from this session.</>
        )}{" "}
        If you have questions, please contact {MINISTRY_LEADER} for further information. You may
        rejoin future meetings unless you are explicitly blocked.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {onContinue ? (
          <button type="button" onClick={onContinue} className="btn-primary !px-6 !py-3">
            Back to Livestream
          </button>
        ) : (
          <Link href={livestreamPath} className="btn-primary inline-flex !px-6 !py-3">
            Back to Livestream
          </Link>
        )}
        <Link href={dashboardPath} className="btn-secondary inline-flex !px-6 !py-3">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
