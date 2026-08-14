"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import type { Member } from "./types";

type Props = {
  value: Member | null;
  onChange: (member: Member | null) => void;
  placeholder?: string;
  status?: "APPROVED" | "ALL";
};

export function MemberSearchPicker({
  value,
  onChange,
  placeholder = "Search by name or email...",
  status = "APPROVED",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: q.trim(),
          limit: "8",
          page: "1",
          status: status === "ALL" ? "ALL" : "APPROVED",
        });
        const res = await fetch(`/api/admin/members?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.members as Member[]);
        }
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open && !value) void search(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, search, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-cream-dark px-3 py-2">
        <UserAvatar userId={value.id} name={value.name} avatarUrl={value.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-burgundy">{value.name}</p>
          <p className="truncate text-xs text-burgundy/55">{value.email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
            setResults([]);
          }}
          className="rounded-lg p-1 text-burgundy/50 hover:bg-burgundy/10 hover:text-burgundy"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-burgundy/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input-field !pl-10"
          autoComplete="off"
        />
      </div>

      {open && query.trim() && (
        <ul className="chat-scroll-gold absolute z-20 mt-1 max-h-56 w-full rounded-xl border border-gold/30 bg-cream shadow-lg">
          {loading && (
            <li className="px-4 py-3 text-sm text-burgundy/60">Searching...</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-burgundy/60">No members found.</li>
          )}
          {!loading &&
            results.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(member);
                    setOpen(false);
                    setQuery("");
                    setResults([]);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gold/10"
                >
                  <UserAvatar
                    userId={member.id}
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-burgundy">{member.name}</p>
                    <p className="truncate text-xs text-burgundy/55">{member.email}</p>
                  </div>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
