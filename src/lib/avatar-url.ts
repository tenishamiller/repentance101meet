/** Normalize stored avatar paths to a browser-loadable URL. */
export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${trimmed}`;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    return base ? `${base}${trimmed}` : trimmed;
  }
  return trimmed;
}

export function avatarUrlFromLiveKitMetadata(metadata?: string): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { avatarUrl?: unknown };
    return typeof parsed.avatarUrl === "string" && parsed.avatarUrl.trim()
      ? parsed.avatarUrl.trim()
      : null;
  } catch {
    return null;
  }
}
