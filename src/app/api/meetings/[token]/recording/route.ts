import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createSignedUpload,
  isCloudStorageConfigured,
  uploadObjectBuffer,
} from "@/lib/object-storage";
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

/** Prepare signed upload URL for large recordings (direct to MinIO or Supabase). */
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

  await request.json().catch(() => ({}));
  const ext = ".webm";
  const storagePath = `recordings/${ctx.meeting.id}/${Date.now()}${ext}`;

  if (isCloudStorageConfigured()) {
    try {
      const signed = await createSignedUpload({
        storagePath,
        contentType: RECORDING_CONTENT_TYPE,
        upsert: true,
      });
      return Response.json({
        signedUrl: signed.signedUrl,
        path: signed.path,
        publicUrl: signed.publicUrl,
        token: signed.token,
        contentType: RECORDING_CONTENT_TYPE,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload sign failed";
      return Response.json({ error: message }, { status: 500 });
    }
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

  if (isCloudStorageConfigured()) {
    try {
      const { publicUrl } = await uploadObjectBuffer({
        storagePath,
        buffer,
        contentType: RECORDING_CONTENT_TYPE,
        upsert: true,
      });
      await prisma.meeting.update({
        where: { id: ctx.meeting.id },
        data: { recordingUrl: publicUrl },
      });
      return Response.json({ publicUrl, path: storagePath });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      return Response.json({ error: message }, { status: 500 });
    }
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
