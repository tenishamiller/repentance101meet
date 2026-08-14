"use client";

type Props = {
  count: number;
  className?: string;
};

export function UnreadCountBadge({ count, className = "" }: Props) {
  if (count <= 0) return null;

  return (
    <span
      className={`absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold leading-none text-burgundy-deep ring-2 ring-burgundy-dark ${className}`}
      aria-label={`${count} unread messages`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
