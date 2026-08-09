"use client";

import { SessionProvider } from "next-auth/react";
import { SessionStatusSync } from "@/components/SessionStatusSync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionStatusSync />
      {children}
    </SessionProvider>
  );
}
