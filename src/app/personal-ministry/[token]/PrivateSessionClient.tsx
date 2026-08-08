"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PrivateMinistryRoom } from "@/components/private-ministry/PrivateMinistryRoom";

type Props = {
  token: string;
};

export function PrivateSessionClient({ token }: Props) {
  const [data, setData] = useState<{
    session: {
      id: string;
      title: string;
      createdById: string;
      isOnboardingApproval: boolean;
      invitedUserId: string | null;
    };
    isHost: boolean;
    peer: { id: string; name: string; avatarUrl: string | null };
    user: { id: string; name: string };
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/private-ministry/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Cannot join session");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to connect"));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <h1 className="font-serif text-2xl font-bold text-burgundy">Cannot Join Session</h1>
        <p className="mt-2 max-w-md text-center text-burgundy/70">{error}</p>
        <Link href="/messages" className="btn-primary mt-6">
          Back to Membership Messages
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full border-2 border-gold bg-burgundy/20" />
        <p className="font-serif text-burgundy/70">Entering private session...</p>
      </div>
    );
  }

  return (
    <PrivateMinistryRoom
      meetingToken={token}
      meetingTitle={data.session.title}
      sessionId={data.session.id}
      userId={data.user.id}
      userName={data.user.name}
      isHost={data.isHost}
      hostId={data.session.createdById}
      peer={data.peer}
      isOnboardingApproval={data.session.isOnboardingApproval}
      invitedUserId={data.session.invitedUserId}
    />
  );
}
