"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
};

/** User-uploaded avatars — native img avoids Next.js remote image config issues. */
export function AvatarImage({ src, alt, className, onError }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-provided URLs from Supabase/local storage
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}
