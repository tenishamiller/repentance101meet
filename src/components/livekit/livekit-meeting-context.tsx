"use client";

import { createContext, useContext } from "react";

export type LiveKitMeetingContextValue = {
  isHost: boolean;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  reloadToken: () => Promise<void>;
};

export const LiveKitMeetingContext = createContext<LiveKitMeetingContextValue | null>(null);

export function useLiveKitMeeting() {
  return useContext(LiveKitMeetingContext);
}
