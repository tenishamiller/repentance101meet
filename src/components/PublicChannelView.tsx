"use client";

import { useState } from "react";
import type { Channel } from "@/generated/prisma/client";

type Props = {
  channel: Channel;
  isAdmin: boolean;
};

function renderMarkdown(content: string) {
  return content
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={i} className="mb-4 font-serif text-3xl font-bold">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="mb-3 mt-6 font-serif text-xl font-semibold">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="mb-2 mt-4 font-semibold">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 list-disc">
            {line.slice(2)}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} className="mb-2">
          {line}
        </p>
      );
    });
}

export function PublicChannelView({ channel, isAdmin }: Props) {
  const [content, setContent] = useState(channel.content ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/channels/${channel.slug}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
            Public Channel
          </p>
          <h1 className="font-serif text-3xl font-bold">{channel.name}</h1>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
          >
            {editing ? "Cancel" : "Edit Content"}
          </button>
        )}
      </div>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          Saved! Changes are live for all members.
        </div>
      )}

      {editing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full rounded-xl border border-stone-300 p-4 font-mono text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-lg bg-amber-600 px-6 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      ) : (
        <div className="prose-ministry rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          {renderMarkdown(content || "No content yet.")}
        </div>
      )}
    </div>
  );
}
