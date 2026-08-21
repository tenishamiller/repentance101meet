"use client";

type Props = {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
  onLoad?: () => void;
};

/** User-uploaded avatars — native img avoids Next.js remote image config issues. */
export function AvatarImage({ src, alt, className, onError, onLoad }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user-provided URLs from object storage
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      referrerPolicy="no-referrer"
      onLoad={() => onLoad?.()}
      onError={() => onError?.()}
    />
  );
}
