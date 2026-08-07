"use client";

import { useState } from "react";
import type { Channel } from "@/generated/prisma/client";
import { BrandDivider } from "@/components/BrandDivider";

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
          <h1 key={i} className="mb-4 font-serif text-3xl font-bold text-burgundy">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="mb-3 mt-6 font-serif text-xl font-semibold text-burgundy">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="mb-2 mt-4 font-semibold text-burgundy">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 list-disc text-burgundy/90">
            {line.slice(2)}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} className="mb-2 text-burgundy/90">
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
          <p className="text-sm font-medium uppercase tracking-wide text-gold-muted">
            Public Channel
          </p>
          <h1 className="font-serif text-3xl font-bold text-burgundy">{channel.name}</h1>
          <BrandDivider className="my-3 max-w-xs" />
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="btn-outline-gold !px-4 !py-2 text-sm"
          >
            {editing ? "Cancel" : "Edit Content"}
          </button>
        )}
      </div>

      {saved && (
        <div className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-burgundy">
          Saved! Changes are live for all members.
        </div>
      )}

      {editing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="input-field font-mono text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary mt-4 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      ) : (
        <div className="card-brand prose-ministry p-8">{renderMarkdown(content || "No content yet.")}</div>
      )}
    </div>
  );
}
