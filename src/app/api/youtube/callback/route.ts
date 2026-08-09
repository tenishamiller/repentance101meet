import { NextRequest, NextResponse } from "next/server";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  let returnTo = "/admin?tab=livestream";
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as {
        returnTo?: string;
      };
      if (parsed.returnTo?.startsWith("/")) returnTo = parsed.returnTo;
    } catch {
      /* ignore */
    }
  }

  const redirect = (query: string) =>
    NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}${query}`, request.url));

  if (error || !code) {
    return redirect("youtube=error");
  }

  const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirect("youtube=not-configured");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${request.nextUrl.origin}/api/youtube/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return redirect("youtube=token-failed");
  }

  const tokens = (await tokenRes.json()) as TokenResponse;
  const response = redirect("youtube=connected");

  response.cookies.set("yt_access_token", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: tokens.expires_in,
    path: "/",
  });

  if (tokens.refresh_token) {
    response.cookies.set("yt_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }

  return response;
}
