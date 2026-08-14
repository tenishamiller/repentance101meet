/** Only allow same-origin relative paths. Reject protocol-relative and login loops. */
export function safeCallbackUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.startsWith("/login") || path.startsWith("/m/login")) return null;
  if (path.startsWith("/host") || path.startsWith("/m/host")) return null;
  return path;
}
