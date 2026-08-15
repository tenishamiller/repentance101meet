import path from "path";
import { v4 as uuidv4 } from "uuid";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  meetingChatFileSizeError,
  meetingChatFileTooLarge,
} from "@/lib/chat-attachments";

type RouteParams = { params: Promise<{ token: string }> };

async function assertCanAttach(token: string, userId: string) {
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return { error: "Meeting not found", status: 404 as const };
  }
  if (meeting.status !== "LIVE") {
    return { error: "Meeting is not live", status: 403 as const };
  }

  const participant = await prisma.meetingParticipant.findUnique({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
  });

  if (participant?.blocked || !participant) {
    return { error: "Join the meeting to attach files", status: 403 as const };
  }

  return { meeting };
}

/** Signed upload URL for chat attachments (direct to Supabase storage). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const ctx = await assertCanAttach(token, session.user.id);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await request.json();
  const filename = typeof body.filename === "string" ? body.filename : "file";
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "application/octet-stream";
  const size = typeof body.size === "number" ? body.size : 0;

  if (!size || size <= 0) {
    return Response.json({ error: "Invalid file size" }, { status: 400 });
  }

  if (meetingChatFileTooLarge(size)) {
    return Response.json({ error: meetingChatFileSizeError() }, { status: 400 });
  }

  const ext = path.extname(filename) || "";
  const storagePath = `chat/${ctx.meeting.id}/${session.user.id}/${uuidv4()}${ext}`;

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "File storage is not configured", status: 503 });
  }

  const supabase = createSupabaseAdmin()!;
  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error || !data) {
    return Response.json({ error: error?.message ?? "Upload sign failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(storagePath);

  return Response.json({
    signedUrl: data.signedUrl,
    path: storagePath,
    publicUrl: urlData.publicUrl,
    token: data.token,
    contentType,
  });
}
