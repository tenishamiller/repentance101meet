"use client";

import Link from "next/link";
import { Download, Mic, Radio, Share2, Video } from "lucide-react";
import { MemberJoinLink } from "@/components/livestream/MemberJoinLink";
import { formatDate } from "@/lib/utils";
import type { Meeting } from "./types";

type Props = {
  meetings: Meeting[];
  recordings: Meeting[];
  newMeetingTitle: string;
  onTitleChange: (title: string) => void;
  onCreateMeeting: () => void;
  generatedLinkToken: string;
  onMeetingAction: (meetingId: string, action: "start" | "end") => void;
};

export function AdminLivestreamPanel({
  meetings,
  recordings,
  newMeetingTitle,
  onTitleChange,
  onCreateMeeting,
  generatedLinkToken,
  onMeetingAction,
}: Props) {
  const liveMeeting = meetings.find((m) => m.status === "LIVE");

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Feature guide */}
      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-cream-dark to-cream p-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-burgundy">
          Live Teaching Room
        </h2>
        <p className="mb-4 text-sm text-burgundy/70">
          Generate a member link, start your session, and broadcast with full controls — camera,
          mic, screen share, recording, chat with attachments, raise hand, and member reactions.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Share2, label: "Share member link" },
            { icon: Video, label: "Camera & screen share" },
            { icon: Mic, label: "Mute & raise hand" },
            { icon: Download, label: "Download recording" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg bg-cream px-3 py-2 text-sm text-burgundy/80"
            >
              <Icon className="h-4 w-4 text-gold-muted" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Create link */}
      <section className="card-brand p-6">
        <h2 className="mb-2 font-serif text-xl font-semibold text-burgundy">
          Generate Member Join Link
        </h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Approved members use this special link to enter your teaching room. They must be logged
          in with a profile.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newMeetingTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="input-field flex-1"
            placeholder="e.g. Repentance 101 — Sunday Teaching"
          />
          <button
            type="button"
            onClick={onCreateMeeting}
            className="btn-primary inline-flex shrink-0 items-center gap-2 !px-6"
          >
            <Radio className="h-4 w-4" />
            Generate Link
          </button>
        </div>
      </section>

      {generatedLinkToken && (
        <MemberJoinLink
          meetingToken={generatedLinkToken}
          title="New Member Join Link"
          variant="hero"
        />
      )}

      {liveMeeting && (
        <div className="hero-brand rounded-2xl p-5">
          <p className="badge-live mb-2 w-fit">● LIVE NOW</p>
          <p className="font-serif text-xl font-bold text-cream">{liveMeeting.title}</p>
          <Link
            href={`/meeting/${liveMeeting.linkToken}`}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Video className="h-5 w-5" />
            Enter as Host
          </Link>
        </div>
      )}

      {/* Active & scheduled meetings */}
      <section className="card-brand p-6">
        <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">Your Sessions</h2>
        {meetings.length === 0 ? (
          <p className="text-burgundy/60">No sessions yet — generate a member link above.</p>
        ) : (
          <div className="space-y-4">
            {meetings.map((m) => (
              <div key={m.id} className="rounded-xl border border-gold/25 bg-cream-dark p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-serif text-lg font-semibold text-burgundy">{m.title}</p>
                    <p className="mt-1 text-sm text-burgundy/60">
                      {m.status === "LIVE" ? (
                        <span className="font-bold text-gold-muted">● LIVE NOW</span>
                      ) : (
                        <span>{m.status}</span>
                      )}
                      {" · "}
                      {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.status === "SCHEDULED" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onMeetingAction(m.id, "start")}
                          className="btn-primary !px-4 !py-2 text-sm"
                        >
                          Start Meeting
                        </button>
                        <Link
                          href={`/meeting/${m.linkToken}`}
                          className="btn-outline-gold !px-4 !py-2 text-sm"
                        >
                          Open as Host
                        </Link>
                      </>
                    )}
                    {m.status === "LIVE" && (
                      <>
                        <Link
                          href={`/meeting/${m.linkToken}`}
                          className="btn-burgundy !px-4 !py-2 text-sm"
                        >
                          Go Live (Host)
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            const ok = window.confirm(
                              "End this session from Admin?\n\nThis stops the livestream for everyone but does NOT save a recording. To save to the Recording Library, use End & Download in the meeting room while recording.",
                            );
                            if (ok) onMeetingAction(m.id, "end");
                          }}
                          className="rounded-lg border border-burgundy/30 bg-burgundy/10 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/20"
                        >
                          End Session
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <MemberJoinLink meetingToken={m.linkToken} variant="row" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recording library */}
      <section className="card-brand p-6">
        <h2 className="mb-1 font-serif text-xl font-semibold text-burgundy">Recording Library</h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Cloud recordings appear here after you <strong className="font-semibold text-burgundy">Record</strong> during
          a live session and finish with <strong className="font-semibold text-burgundy">End &amp; Download</strong> in
          the meeting room. Ending from Admin alone does not save a recording.
        </p>
        {recordings.length === 0 ? (
          <div className="rounded-xl bg-cream-dark px-4 py-6 text-center">
            <p className="font-medium text-burgundy/70">No recordings in the library yet.</p>
            <p className="mt-2 text-sm text-burgundy/55">
              Your browser also downloads a copy when you use End &amp; Download — check your Downloads folder if
              you recorded but nothing appears here (upload may have failed).
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gold/15">
            {recordings.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-burgundy">{r.title}</p>
                  <p className="text-xs text-burgundy/55">
                    Ended {r.endedAt ? formatDate(r.endedAt) : formatDate(r.createdAt)}
                  </p>
                </div>
                {r.recordingUrl && (
                  <a
                    href={`/api/admin/recordings/${r.id}/download`}
                    className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-burgundy-deep hover:bg-gold-light"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
