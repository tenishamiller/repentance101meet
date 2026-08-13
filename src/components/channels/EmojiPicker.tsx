"use client";

import { useEffect, useRef, useState } from "react";
import { Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMOJI_CATEGORIES, QUICK_EMOJIS } from "@/lib/channel-messages";

type Props = {
  onSelect: (emoji: string) => void;
  className?: string;
  buttonClassName?: string;
};

export function EmojiPicker({ onSelect, className, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function pick(emoji: string) {
    onSelect(emoji);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-cream text-burgundy transition hover:border-gold hover:bg-gold/10",
          buttonClassName,
        )}
        aria-label="Add emoji"
        title="Add emoji"
      >
        <Smile className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border border-gold/30 bg-cream p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-burgundy">Pick an emoji</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-burgundy/50 hover:bg-burgundy/5 hover:text-burgundy"
              aria-label="Close emoji picker"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={`quick-${emoji}`}
                type="button"
                onClick={() => pick(emoji)}
                className="rounded-lg px-2 py-1 text-xl transition hover:bg-gold/15"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="max-h-48 space-y-3 overflow-y-auto pr-1">
            {EMOJI_CATEGORIES.map((category) => (
              <div key={category.label}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-burgundy/50">
                  {category.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {category.emojis.map((emoji) => (
                    <button
                      key={`${category.label}-${emoji}`}
                      type="button"
                      onClick={() => pick(emoji)}
                      className="rounded-lg px-2 py-1 text-xl transition hover:bg-gold/15"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuickEmojiBar({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {QUICK_EMOJIS.slice(0, 8).map((emoji) => (
        <button
          key={`bar-${emoji}`}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded-lg px-2 py-1 text-lg transition hover:bg-gold/15"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
