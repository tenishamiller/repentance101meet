"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAppPath } from "@/hooks/useAppBase";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function AppPathLink({ href, className, children, onClick }: Props) {
  const path = useAppPath(href);
  return (
    <Link href={path} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
