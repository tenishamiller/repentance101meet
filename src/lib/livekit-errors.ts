/** LiveKit publish errors when the JWT does not grant camera/mic (host policy). */
export function isLiveKitPermissionError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("insufficient permissions") ||
    normalized.includes("permission denied")
  );
}
