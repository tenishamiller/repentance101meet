"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PrivateMinistryRoom } from "@/components/private-ministry/PrivateMinistryRoom";

type Props = {
  token: string;
};

type SessionPayload = {
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
};

export function PrivateSessionClient({ token }: Props) {
  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState("");
  const [waitingForHost, setWaitingForHost] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function join() {
      try {
        const res = await fetch(`/api/private-ministry/${token}`);
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          if (json.code === "HOST_NOT_STARTED") {
            setWaitingForHost(true);
            setError("");
            timer = setTimeout(() => void join(), 3000);
            return;
          }
          setWaitingForHost(false);
          setError(json.error ?? "Cannot join session");
          return;
        }

        setWaitingForHost(false);
        setError("");
        setData(json);
      } catch {
        if (!cancelled) {
          setWaitingForHost(false);
          setError("Failed to connect");
        }
      }
    }

    void join();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  if (waitingForHost) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="h-10 w-10 animate-pulse rounded-full border-2 border-gold bg-burgundy/20" />
        <h1 className="mt-4 font-serif text-2xl font-bold text-burgundy">Waiting for Host</h1>
        <p className="mt-2 max-w-md text-center text-burgundy/70">
          The host hasn&apos;t entered yet. This page will join automatically when the session
          starts.
        </p>
        <Link href="/messages" className="btn-secondary mt-6">
          Back to Membership Messages
        </Link>
      </div>
    );
  }

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
