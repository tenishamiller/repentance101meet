"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LivestreamRoom } from "@/components/livestream/LivestreamRoom";
import { MeetingEndedScreen } from "@/components/livestream/MeetingEndedScreen";
import {
  hasRecordingConsent,
  RecordingConsentGate,
  saveRecordingConsent,
} from "@/components/livestream/RecordingConsentGate";

type Props = {
  token: string;
};

export function MeetingPageClient({ token }: Props) {
  const [data, setData] = useState<{
    meeting: { title: string; createdById: string };
    isHost: boolean;
    user: { id: string; name: string; avatarUrl: string | null };
  } | null>(null);
  const [endedMeeting, setEndedMeeting] = useState<{ title: string } | null>(null);
  const [error, setError] = useState("");
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (hasRecordingConsent(token)) {
      setConsented(true);
    }
  }, [token]);

  useEffect(() => {
    fetch(`/api/meetings/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (json.code === "MEETING_ENDED" && json.meeting?.title) {
            setEndedMeeting({ title: json.meeting.title });
            return;
          }
          setError(json.error ?? "Cannot join meeting");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to connect"));
  }, [token]);

  function acceptConsent() {
    saveRecordingConsent(token);
    setConsented(true);
  }

  if (endedMeeting) {
    return <MeetingEndedScreen meetingTitle={endedMeeting.title} variant="viewer" />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <h1 className="font-serif text-2xl font-bold text-burgundy">Cannot Join Meeting</h1>
        <p className="mt-2 text-burgundy/70">{error}</p>
        <Link href="/livestream" className="btn-primary mt-6">
          Back to Livestream
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full border-2 border-gold bg-burgundy/20" />
        <p className="font-serif text-burgundy/70">Connecting to livestream...</p>
      </div>
    );
  }

  if (!data.isHost && !consented) {
    return (
      <RecordingConsentGate meetingTitle={data.meeting.title} onAccept={acceptConsent} />
    );
  }

  return (
    <LivestreamRoom
      meetingToken={token}
      meetingTitle={data.meeting.title}
      userId={data.user.id}
      userName={data.user.name}
      avatarUrl={data.user.avatarUrl}
      isHost={data.isHost}
      hostId={data.meeting.createdById}
    />
  );
}
