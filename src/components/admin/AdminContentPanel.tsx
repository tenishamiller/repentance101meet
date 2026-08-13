"use client";

import { useState } from "react";
import { BookOpen, Calendar, Check, NotebookPen } from "lucide-react";
import Link from "next/link";
import { LivestreamScheduleEditor } from "@/components/LivestreamScheduleEditor";
import type { ChannelSummary } from "./types";

type Props = {
  channels: ChannelSummary[];
  onRefresh: () => void;
};

function GuidelinesEditor({
  slug,
  initialContent,
  onSaved,
}: {
  slug: string;
  initialContent: string;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/channels/${slug}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setEditing(false);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-burgundy/60">
          Public guidelines visible to everyone — updates go live immediately.
        </p>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="btn-outline-gold !px-4 !py-2 text-sm"
        >
          {editing ? "Cancel" : "Edit Guidelines"}
        </button>
      </div>
      {saved && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-burgundy">
          <Check className="h-4 w-4" />
          Guidelines saved!
        </div>
      )}
      {editing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="input-field font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-primary mt-3 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Guidelines"}
          </button>
        </div>
      ) : (
        <div className="prose-ministry max-h-64 overflow-y-auto rounded-xl bg-cream-dark p-6">
          {content.split("\n").map((line, i) => {
            if (line.startsWith("# "))
              return (
                <h2 key={i} className="mb-2 font-serif text-xl font-bold text-burgundy">
                  {line.slice(2)}
                </h2>
              );
            if (line.startsWith("## "))
              return (
                <h3 key={i} className="mb-2 mt-3 font-serif text-lg font-semibold text-burgundy">
                  {line.slice(3)}
                </h3>
              );
            if (line.startsWith("- "))
              return (
                <li key={i} className="ml-4 list-disc text-burgundy/90">
                  {line.slice(2)}
                </li>
              );
            if (line.trim() === "") return <br key={i} />;
            return (
              <p key={i} className="text-burgundy/90">
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminContentPanel({ channels, onRefresh }: Props) {
  const guidelines = channels.find((c) => c.slug === "guidelines");
  const livestream = channels.find((c) => c.slug === "livestream");

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="card-brand p-6">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-xl font-semibold text-burgundy">
          <NotebookPen className="h-5 w-5 text-gold-muted" />
          In case you missed it
        </h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Post Monday–Friday topics and up to five links per day. Members see it
          as a weekly planner.
        </p>
        <Link href="/missed-it" className="btn-primary inline-flex !px-4 !py-2 text-sm">
          Open weekly planner
        </Link>
      </section>
      <section className="card-brand p-6">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-xl font-semibold text-burgundy">
          <BookOpen className="h-5 w-5 text-gold-muted" />
          Guideline Channel
        </h2>
        {guidelines ? (
          <GuidelinesEditor
            slug="guidelines"
            initialContent={guidelines.content ?? ""}
            onSaved={onRefresh}
          />
        ) : (
          <p className="text-burgundy/60">Guidelines channel not found.</p>
        )}
      </section>

      <section className="card-brand p-6">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-xl font-semibold text-burgundy">
          <Calendar className="h-5 w-5 text-gold-muted" />
          Livestream Schedule & Information
        </h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Members see this on the Live Meeting page. Edit your teaching schedule and session details.
        </p>
        {livestream ? (
          <LivestreamScheduleEditor
            channelSlug="livestream"
            initialContent={livestream.content ?? ""}
          />
        ) : (
          <p className="text-burgundy/60">Livestream channel not found.</p>
        )}
      </section>
    </div>
  );
}
