import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { YOUTUBE_RTMP_URL, type YouTubeBroadcastInfo } from "@/lib/youtube-live";

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function getAccessToken(request: NextRequest) {
  const access = request.cookies.get("yt_access_token")?.value;
  if (access) return access;

  const refresh = request.cookies.get("yt_refresh_token")?.value;
  if (!refresh) return null;
  return refreshAccessToken(refresh);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Repentance 101 Live";

  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    return Response.json(
      { error: "Connect your YouTube account first, or paste a stream key manually." },
      { status: 401 },
    );
  }

  const streamRes = await fetch(
    "https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: { title: `${title} — stream` },
        cdn: {
          frameRate: "variable",
          ingestionType: "rtmp",
          resolution: "variable",
        },
      }),
    },
  );

  if (!streamRes.ok) {
    const detail = await streamRes.text();
    return Response.json({ error: detail || "Could not create YouTube stream" }, { status: 500 });
  }

  const stream = await streamRes.json();

  const broadcastRes = await fetch(
    "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          title,
          scheduledStartTime: new Date().toISOString(),
        },
        status: { privacyStatus: "unlisted" },
        contentDetails: {
          enableAutoStart: true,
          enableAutoStop: true,
          enableDvr: true,
          recordFromStart: true,
        },
      }),
    },
  );

  if (!broadcastRes.ok) {
    const detail = await broadcastRes.text();
    return Response.json({ error: detail || "Could not create YouTube broadcast" }, { status: 500 });
  }

  const broadcast = await broadcastRes.json();

  const bindRes = await fetch(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcast.id}&streamId=${stream.id}&part=id,contentDetails,status`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!bindRes.ok) {
    const detail = await bindRes.text();
    return Response.json({ error: detail || "Could not bind YouTube broadcast" }, { status: 500 });
  }

  const transitionRes = await fetch(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=live&id=${broadcast.id}&part=status`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!transitionRes.ok) {
    const testRes = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=testing&id=${broadcast.id}&part=status`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!testRes.ok) {
      const detail = await testRes.text();
      return Response.json(
        { error: detail || "Broadcast created but could not go live on YouTube yet." },
        { status: 500 },
      );
    }
  }

  const info: YouTubeBroadcastInfo = {
    broadcastId: broadcast.id,
    streamId: stream.id,
    title,
    streamKey: stream.cdn?.ingestionInfo?.streamName ?? "",
    rtmpUrl: stream.cdn?.ingestionInfo?.ingestionAddress ?? YOUTUBE_RTMP_URL,
    watchUrl: broadcast.id ? `https://www.youtube.com/watch?v=${broadcast.id}` : null,
    status: broadcast.status?.lifeCycleStatus ?? "created",
  };

  return Response.json({ broadcast: info });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({
    connected: Boolean(
      request.cookies.get("yt_access_token")?.value ||
        request.cookies.get("yt_refresh_token")?.value,
    ),
    oauthConfigured: Boolean(process.env.GOOGLE_YOUTUBE_CLIENT_ID),
    rtmpUrl: YOUTUBE_RTMP_URL,
  });
}
