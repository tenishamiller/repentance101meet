import { unquoteEnv } from "@/lib/env";

const PRODUCTION_APP_URL = "https://repentance101ministry.com";

/** Public site URL for links, auth, and emails — never localhost in production. */
export function getAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
  ];

  for (const value of candidates) {
    const url = unquoteEnv(value);
    if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      return url.replace(/\/$/, "");
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return PRODUCTION_APP_URL;
}
