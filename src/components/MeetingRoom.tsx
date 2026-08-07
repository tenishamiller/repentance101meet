"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";

type MeetingMessage = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

type Props = {
  token: string;
  livekitUrl: string;
  meetingToken: string;
  isAdmin: boolean;
  userId: string;
  userName: string;
};

function MeetingChat({
  meetingToken,
  userId,
  isAdmin,
}: {
  meetingToken: string;
  userId: string;
  isAdmin: boolean;
}) {
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingToken}/chat`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, [meetingToken]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await fetch(`/api/meetings/${meetingToken}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setContent("");
    fetchMessages();
  }

  async function blockUser(targetUserId: string) {
    if (!isAdmin) return;
    await fetch(`/api/meetings/${meetingToken}/chat`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId, action: "block" }),
    });
  }

  return (
    <div className="flex h-full flex-col border-l border-stone-700 bg-stone-900">
      <div className="border-b border-stone-700 px-4 py-3">
        <h3 className="font-semibold text-white">Meeting Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-3 flex gap-2">
            <UserAvatar
              userId={msg.user.id}
              name={msg.user.name}
              avatarUrl={msg.user.avatarUrl}
              size="sm"
            />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-amber-300">{msg.user.name}</span>
                <span className="text-xs text-stone-500">{formatDate(msg.createdAt)}</span>
              </div>
              <p className="text-sm text-stone-200">{msg.content}</p>
              {isAdmin && msg.user.id !== userId && (
                <button
                  type="button"
                  onClick={() => blockUser(msg.user.id)}
                  className="mt-1 text-xs text-red-400 hover:underline"
                >
                  Block
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="border-t border-stone-700 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg bg-stone-800 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function MeetingControls({
  meetingToken,
  userId,
  isAdmin,
}: {
  meetingToken: string;
  userId: string;
  isAdmin: boolean;
}) {
  const [handRaised, setHandRaised] = useState(false);

  async function toggleHand() {
    const action = handRaised ? "lower-hand" : "raise-hand";
    await fetch(`/api/meetings/${meetingToken}/chat`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setHandRaised(!handRaised);
  }

  return (
    <div className="flex items-center justify-center gap-3 border-t border-stone-700 bg-stone-900 px-4 py-3">
      <button
        type="button"
        onClick={toggleHand}
        className={`rounded-full px-4 py-2 text-sm font-medium ${
          handRaised
            ? "bg-amber-500 text-white"
            : "bg-stone-700 text-stone-200 hover:bg-stone-600"
        }`}
      >
        {handRaised ? "✋ Hand Raised" : "Raise Hand"}
      </button>
      {isAdmin && (
        <span className="rounded-full bg-amber-700 px-3 py-1 text-xs font-semibold text-white">
          Admin Controls Active
        </span>
      )}
    </div>
  );
}

export function MeetingRoomClient({
  token,
  livekitUrl,
  meetingToken,
  isAdmin,
  userId,
  userName,
}: Props) {
  return (
    <div className="flex h-[calc(100vh-80px)] flex-col lg:flex-row">
      <div className="flex flex-1 flex-col">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={livekitUrl}
          data-lk-theme="default"
          style={{ height: "100%" }}
        >
          <VideoConference />
          <RoomAudioRenderer />
          <MeetingControls meetingToken={meetingToken} userId={userId} isAdmin={isAdmin} />
        </LiveKitRoom>
      </div>
      <div className="h-80 w-full lg:h-auto lg:w-80">
        <MeetingChat meetingToken={meetingToken} userId={userId} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
