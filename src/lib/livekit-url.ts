import { unquoteEnv } from "@/lib/env";

/** Websocket URL the browser can pass to LiveKit. Empty if the env value is not a URL. */
export function normalizeLiveKitUrl(raw: string | undefined) {
  const value = unquoteEnv(raw);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") parsed.protocol = "wss:";
    else if (parsed.protocol === "http:") parsed.protocol = "ws:";
    if (parsed.protocol !== "wss:" && parsed.protocol !== "ws:") return "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}
