"use client";

import { useEffect, useState } from "react";
import { AppPathLink } from "@/components/AppPathLink";
import { LivestreamRoom } from "@/components/livestream/LivestreamRoom";
import { MeetingEndedScreen } from "@/components/livestream/MeetingEndedScreen";
import {
  RecordingConsentGate,
} from "@/components/livestream/RecordingConsentGate";
import {
  getMemberJoinSession,
  saveMemberJoinSession,
  type MemberJoinMediaPrefs,
} from "@/lib/member-join-media";

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
  const [joinMedia, setJoinMedia] = useState<MemberJoinMediaPrefs>({
    cameraOn: false,
    micOn: false,
  });

  useEffect(() => {
    const session = getMemberJoinSession(token);
    if (session) {
      setJoinMedia(session);
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

  function acceptConsent(media: MemberJoinMediaPrefs) {
    saveMemberJoinSession(token, media);
    setJoinMedia(media);
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
        <AppPathLink href="/livestream" className="btn-primary mt-6">
          Back to Livestream
        </AppPathLink>
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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <LivestreamRoom
      meetingToken={token}
      meetingTitle={data.meeting.title}
      userId={data.user.id}
      userName={data.user.name}
      avatarUrl={data.user.avatarUrl}
      isHost={data.isHost}
      hostId={data.meeting.createdById}
      joinCameraOn={joinMedia.cameraOn}
      joinMicOn={joinMedia.micOn}
    />
    </div>
  );
}
