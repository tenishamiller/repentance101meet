"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MeetingRoomClient } from "@/components/MeetingRoom";

type Props = {
  token: string;
};

export function MeetingPageClient({ token }: Props) {
  const router = useRouter();
  const [data, setData] = useState<{
    token: string;
    livekitUrl: string;
    isAdmin: boolean;
    user: { id: string; name: string };
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/meetings/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Cannot join meeting");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to connect"));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <h1 className="font-serif text-2xl font-bold text-red-700">Cannot Join Meeting</h1>
        <p className="mt-2 text-stone-600">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-6 rounded-lg bg-amber-600 px-6 py-2 text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-stone-500">Connecting to meeting...</p>
      </div>
    );
  }

  return (
    <MeetingRoomClient
      token={data.token}
      livekitUrl={data.livekitUrl}
      meetingToken={token}
      isAdmin={data.isAdmin}
      userId={data.user.id}
      userName={data.user.name}
    />
  );
}
