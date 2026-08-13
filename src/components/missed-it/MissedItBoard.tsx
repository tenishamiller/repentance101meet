"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pencil } from "lucide-react";
import {
  MAX_LINKS_PER_DAY,
  dateForWeekday,
  shiftWeek,
  weekLabel,
  weekStartIso,
} from "@/lib/missed-it";

type DayData = {
  weekday: number;
  name: string;
  topic: string;
  links: { id?: string; title: string; url: string }[];
};

type Props = {
  initialWeek?: string;
  isAdmin?: boolean;
};

export function MissedItBoard({ initialWeek, isAdmin = false }: Props) {
  const defaultWeek = useMemo(
    () => weekStartIso(initialWeek ? new Date(`${initialWeek}T12:00:00`) : new Date()),
    [initialWeek],
  );
  const [weekStart, setWeekStart] = useState(defaultWeek);
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/missed-it?week=${weekStart}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDays(data.days ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  function go(weeks: number) {
    setEditingDay(null);
    setWeekStart(shiftWeek(weekStart, weeks));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-lg font-semibold text-burgundy">{weekLabel(weekStart)}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="inline-flex items-center gap-1 rounded-xl border border-gold/40 px-3 py-2 text-sm font-semibold text-burgundy hover:bg-gold/10"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(weekStartIso())}
            className="rounded-xl border border-gold/40 px-3 py-2 text-sm font-semibold text-burgundy hover:bg-gold/10"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="inline-flex items-center gap-1 rounded-xl border border-gold/40 px-3 py-2 text-sm font-semibold text-burgundy hover:bg-gold/10"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-burgundy/60">Loading this week…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {days.map((day) => (
            <article
              key={day.weekday}
              className="flex min-h-[16rem] flex-col rounded-2xl border border-gold/30 bg-white p-4 shadow-sm"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-muted">
                {day.name}
              </p>
              <p className="text-xs text-burgundy/50">{dateForWeekday(weekStart, day.weekday)}</p>
              {isAdmin && editingDay === day.weekday ? (
                <DayEditor
                  weekStart={weekStart}
                  day={day}
                  onCancel={() => setEditingDay(null)}
                  onSaved={(updated) => {
                    setDays((current) =>
                      current.map((item) => (item.weekday === updated.weekday ? updated : item)),
                    );
                    setEditingDay(null);
                  }}
                />
              ) : (
                <>
                  <h2 className="mt-3 font-serif text-lg font-semibold leading-snug text-burgundy">
                    {day.topic || "Nothing posted yet"}
                  </h2>
                  <ul className="mt-3 flex-1 space-y-2">
                    {day.links.length === 0 ? (
                      <li className="text-sm text-burgundy/45">No links yet.</li>
                    ) : (
                      day.links.map((link) => (
                        <li key={`${link.url}-${link.title}`}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-start gap-1.5 text-sm font-medium text-burgundy underline decoration-gold/50 underline-offset-2 hover:text-burgundy-dark"
                          >
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-muted" />
                            {link.title}
                          </a>
                        </li>
                      ))
                    )}
                  </ul>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingDay(day.weekday)}
                      className="mt-4 inline-flex items-center gap-1 self-start rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-gold/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {day.topic ? "Edit" : "Post"}
                    </button>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function DayEditor({
  weekStart,
  day,
  onCancel,
  onSaved,
}: {
  weekStart: string;
  day: DayData;
  onCancel: () => void;
  onSaved: (day: DayData) => void;
}) {
  const [topic, setTopic] = useState(day.topic);
  const [links, setLinks] = useState<{ title: string; url: string }[]>(
    day.links.length > 0
      ? day.links.map((link) => ({ title: link.title, url: link.url }))
      : [{ title: "", url: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateLink(index: number, field: "title" | "url", value: string) {
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  }

  async function save() {
    setSaving(true);
    setError("");
    const cleaned = links
      .filter((link) => link.title.trim() && link.url.trim())
      .map((link) => {
        const url = link.url.trim();
        return {
          title: link.title.trim(),
          url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
        };
      });
    const res = await fetch("/api/missed-it", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart,
        weekday: day.weekday,
        topic,
        links: cleaned,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save.");
      return;
    }
    onSaved({
      ...day,
      topic: topic.trim(),
      links: cleaned,
    });
  }

  return (
    <div className="mt-3 flex flex-1 flex-col gap-2">
      <label className="text-xs font-semibold text-burgundy">
        Topic
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          placeholder="What was taught this day…"
          className="input-field mt-1 text-sm"
        />
      </label>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-burgundy/50">
        Links (up to {MAX_LINKS_PER_DAY})
      </p>
      {links.map((link, index) => (
        <div key={index} className="space-y-1">
          <input
            value={link.title}
            onChange={(e) => updateLink(index, "title", e.target.value)}
            placeholder={`Link ${index + 1} title`}
            className="input-field text-sm"
          />
          <input
            value={link.url}
            onChange={(e) => updateLink(index, "url", e.target.value)}
            placeholder="https://"
            className="input-field text-sm"
          />
        </div>
      ))}
      {links.length < MAX_LINKS_PER_DAY && (
        <button
          type="button"
          onClick={() => setLinks((current) => [...current, { title: "", url: "" }])}
          className="text-left text-xs font-semibold text-burgundy/70 hover:text-burgundy"
        >
          + Add link
        </button>
      )}
      {error && <p className="text-xs text-burgundy">{error}</p>}
      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-burgundy/70 hover:bg-cream-dark"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
