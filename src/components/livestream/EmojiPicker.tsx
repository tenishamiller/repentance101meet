"use client";

const EMOJIS = [
  "🙏", "✝️", "📖", "🔥", "❤️", "💯", "👍", "👏", "🎉", "✨",
  "🕊️", "😊", "😂", "🥲", "💪", "🙌", "⭐", "💬", "📎", "✅",
  "❗", "❓", "🎤", "📺", "⛪", "🌟", "💡", "🤝", "👋", "🙂",
];

type Props = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPicker({ onSelect, onClose }: Props) {
  return (
    <div className="absolute bottom-full left-0 z-10 mb-2 w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-gold/40 bg-burgundy p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold-light/70">
          Emojis
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gold-light/60 hover:text-gold"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="rounded-lg p-1.5 text-xl hover:bg-burgundy-dark"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
