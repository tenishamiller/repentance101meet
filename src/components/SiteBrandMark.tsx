"use client";

import { Logo } from "@/components/Logo";

type Props = {
  size?: "sm" | "md" | "lg";
  href?: string;
  showText?: boolean;
};

export function SiteBrandMark({ size = "md", href = "/", showText = true }: Props) {
  return <Logo size={size} href={href} showText={showText} />;
}
