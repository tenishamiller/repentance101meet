import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { YOUTUBE_OAUTH_SCOPES } from "@/lib/youtube-live";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "YouTube OAuth is not configured. Add GOOGLE_YOUTUBE_CLIENT_ID to your environment." },
      { status: 503 },
    );
  }

  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/meeting";
  const redirectUri = `${request.nextUrl.origin}/api/youtube/callback`;
  const state = Buffer.from(JSON.stringify({ returnTo }), "utf8").toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YOUTUBE_OAUTH_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
