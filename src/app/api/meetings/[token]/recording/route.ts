import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { RECORDING_CONTENT_TYPE } from "@/lib/recording";

type RouteParams = { params: Promise<{ token: string }> };

async function assertHost(token: string, userId: string, role: string) {
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting) return { error: "Meeting not found", status: 404 as const };
  if (meeting.deletedAt) return { error: "Meeting not found", status: 404 as const };
  if (meeting.createdById !== userId && role !== "ADMIN") {
    return { error: "Forbidden", status: 403 as const };
  }
  return { meeting };
}

/** Prepare signed upload URL for large recordings (direct to Supabase). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const ctx = await assertHost(token, session.user.id, session.user.role);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const { filename, contentType } = await request.json();
  const ext = ".webm";
  const storagePath = `recordings/${ctx.meeting.id}/${Date.now()}${ext}`;

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdmin()!;
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (error || !data) {
      return Response.json({ error: error?.message ?? "Upload sign failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(storagePath);

    return Response.json({
      signedUrl: data.signedUrl,
      path: storagePath,
      publicUrl: urlData.publicUrl,
      token: data.token,
    });
  }

  return Response.json({
    path: storagePath,
    publicUrl: null,
    signedUrl: null,
    contentType: RECORDING_CONTENT_TYPE,
  });
}

/** Fallback upload through the app server (VPS has no Vercel body/time caps; maxDuration is ignored off-Vercel). */
export const maxDuration = 300;

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const ctx = await assertHost(token, session.user.id, session.user.role);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = ".webm";
  const storagePath = `recordings/${ctx.meeting.id}/${Date.now()}${ext}`;

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdmin()!;
    const { error } = await supabase.storage
      .from("uploads")
      .upload(storagePath, buffer, { contentType: RECORDING_CONTENT_TYPE, upsert: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("uploads").getPublicUrl(storagePath);
    await prisma.meeting.update({
      where: { id: ctx.meeting.id },
      data: { recordingUrl: data.publicUrl },
    });

    return Response.json({ publicUrl: data.publicUrl, path: storagePath });
  }

  const localName = `${ctx.meeting.id}-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "recordings");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, localName), buffer);
  const publicUrl = `/recordings/${localName}`;

  await prisma.meeting.update({
    where: { id: ctx.meeting.id },
    data: { recordingUrl: publicUrl },
  });

  return Response.json({ publicUrl, path: storagePath });
}

/** Save recording URL and end meeting after host finishes upload. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const ctx = await assertHost(token, session.user.id, session.user.role);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await request.json();
  const { publicUrl, action } = body;

  if (action === "end") {
    if (ctx.meeting.status !== "ENDED") {
      await prisma.meetingSignal.create({
        data: {
          meetingId: ctx.meeting.id,
          fromUserId: session.user.id,
          toUserId: null,
          type: "host-ended",
          payload: {},
        },
      });
    }

    const updated = await prisma.meeting.update({
      where: { id: ctx.meeting.id },
      data: {
        status: "ENDED",
        endedAt: ctx.meeting.endedAt ?? new Date(),
        ...(publicUrl ? { recordingUrl: publicUrl } : {}),
      },
    });

    return Response.json({ meeting: updated, recordingUrl: updated.recordingUrl });
  }

  if (publicUrl) {
    const updated = await prisma.meeting.update({
      where: { id: ctx.meeting.id },
      data: { recordingUrl: publicUrl },
    });
    return Response.json({ recordingUrl: updated.recordingUrl });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}
