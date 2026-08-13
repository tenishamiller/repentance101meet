"use client";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  size?: "sm" | "md" | "lg";
  href?: string;
  showText?: boolean;
};

/** Site logo with dark-mode toggle immediately to its left. */
export function SiteBrandMark({ size = "md", href = "/", showText = true }: Props) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <ThemeToggle />
      <Logo size={size} href={href} showText={showText} />
    </div>
  );
}
