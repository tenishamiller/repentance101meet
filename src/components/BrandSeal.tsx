import { cn } from "@/lib/utils";

export const BRAND_SEAL_SRC = "/brand/repentance101-logo.png";
export const BRAND_SEAL_ALT = "Repentance 101 Ministry";

type Props = {
  size: number;
  inverted?: boolean;
  className?: string;
  priority?: boolean;
};

/**
 * Ministry seal as a native img. next/image's optimizer can stay blank in the
 * livestream because WebRTC saturates browser connections and LiveKit's dark
 * color-scheme can hide the cream artwork.
 */
export function BrandSeal({ size, inverted = false, className, priority = false }: Props) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full shadow-lg",
        inverted ? "seal-ring ring-offset-burgundy-deep" : "seal-ring ring-offset-cream",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; avoid optimizer during livestreams */}
      <img
        src={BRAND_SEAL_SRC}
        alt={BRAND_SEAL_ALT}
        width={size}
        height={size}
        className="site-brand-img h-full w-full object-cover"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </div>
  );
}
