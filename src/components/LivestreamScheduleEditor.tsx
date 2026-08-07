"use client";

import { useState } from "react";

type Props = {
  channelSlug: string;
  initialContent: string;
};

export function LivestreamScheduleEditor({ channelSlug, initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/channels/${channelSlug}/content`, {
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
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="btn-outline-gold !px-4 !py-2 text-sm"
        >
          {editing ? "Cancel" : "Edit Schedule"}
        </button>
      </div>
      {saved && (
        <div className="mb-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-burgundy">
          Schedule updated!
        </div>
      )}
      {editing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="input-field font-mono text-sm"
          />
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary mt-3 disabled:opacity-60">
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      ) : (
        <div className="card-brand prose-ministry p-8">
          {content.split("\n").map((line, i) => {
            if (line.startsWith("## "))
              return (
                <h3 key={i} className="mb-2 mt-4 font-serif text-lg font-semibold text-burgundy">
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
