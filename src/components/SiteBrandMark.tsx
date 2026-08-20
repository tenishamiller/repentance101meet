"use client";

import { Logo } from "@/components/Logo";

type Props = {
  size?: "sm" | "md" | "lg";
  href?: string;
  showText?: boolean;
  inverted?: boolean;
  className?: string;
};

export function SiteBrandMark({
  size = "md",
  href = "/",
  showText = true,
  inverted = false,
  className,
}: Props) {
  return (
    <Logo size={size} href={href} showText={showText} inverted={inverted} className={className} />
  );
}
