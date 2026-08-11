/** Polling tuned for ~50 concurrent livestream viewers (reduces API/DB load). */

export const MEETING_POLL = {
  /** Host needs fresher viewer list for moderation. */
  participantsHostMs: 4_000,
  /** Members only need periodic policy / kick checks. */
  participantsMemberMs: 10_000,
  /** Member signal poll (kick, host-ended, media policy). */
  signalsMemberMs: 3_000,
  /** Chat while tab is visible. */
  chatHostMs: 3_500,
  chatMemberMs: 5_000,
} as const;
