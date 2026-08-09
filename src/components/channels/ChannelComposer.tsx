"use client";

import { Paperclip, SendHorizontal } from "lucide-react";
import { EmojiPicker, QuickEmojiBar } from "@/components/channels/EmojiPicker";

type Props = {
  content: string;
  sending: boolean;
  canSend: boolean;
  onContentChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected?: () => void;
  compact?: boolean;
};

export function ChannelComposer({
  content,
  sending,
  canSend,
  onContentChange,
  onSubmit,
  fileRef,
  onFilesSelected,
  compact = false,
}: Props) {
  function insertEmoji(emoji: string) {
    onContentChange(content + emoji);
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "mt-2 space-y-1" : "mt-4 space-y-2"}>
      {!compact && <QuickEmojiBar onSelect={insertEmoji} />}

      <div className="flex items-end gap-2 rounded-2xl border border-gold/35 bg-cream p-2 shadow-sm">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          className="hidden"
          id="channel-file-upload"
          onChange={() => onFilesSelected?.()}
        />

        <label
          htmlFor="channel-file-upload"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gold/30 bg-cream-dark text-burgundy transition hover:border-gold hover:bg-gold/10"
          title="Attach a file"
        >
          <Paperclip className="h-5 w-5" />
        </label>

        <EmojiPicker onSelect={insertEmoji} />

        <textarea
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Share encouragement, scripture, or a link..."
          rows={1}
          className="input-field min-h-[44px] max-h-32 flex-1 resize-none border-0 bg-transparent py-2.5 shadow-none focus:ring-0"
        />

        <button
          type="submit"
          disabled={sending || !canSend}
          className="btn-primary flex h-11 shrink-0 items-center gap-2 !px-4 disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>

      <p className={`text-center text-burgundy/45 ${compact ? "hidden text-[10px] sm:block" : "text-xs"}`}>
        Press Enter to send · Shift+Enter for a new line · Edit or delete your messages within 5 minutes
      </p>
    </form>
  );
}
