"use client";

import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
};

const ACTIVE_STYLE: Record<string, string> = {
  APPROVED: "bg-gold text-burgundy shadow-sm",
  REJECTED: "bg-stone-300 text-stone-800 shadow-sm",
  DENIED: "bg-stone-300 text-stone-800 shadow-sm",
  PENDING: "bg-burgundy/15 text-burgundy shadow-sm",
};

export function StatusToggle<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: Props<T>) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap rounded-lg border border-gold/30 bg-cream p-0.5",
        size === "sm" && "text-xs",
      )}
      role="group"
      aria-label="Membership status"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (!isActive) onChange(option.value);
            }}
            className={cn(
              "rounded-md font-semibold transition",
              size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5 text-xs",
              isActive
                ? (ACTIVE_STYLE[option.value] ?? "bg-burgundy text-cream shadow-sm")
                : "text-burgundy/55 hover:bg-gold/10 hover:text-burgundy",
            )}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const MEMBER_STATUS_OPTIONS = [
  { value: "PENDING" as const, label: "Pending" },
  { value: "APPROVED" as const, label: "Approved" },
  { value: "REJECTED" as const, label: "Denied" },
];

export const CHANNEL_STATUS_OPTIONS = [
  { value: "PENDING" as const, label: "Pending" },
  { value: "APPROVED" as const, label: "Approved" },
  { value: "DENIED" as const, label: "Denied" },
];
