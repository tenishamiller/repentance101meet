import path from "path";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import {
  createSignedUpload,
  isCloudStorageConfigured,
} from "@/lib/object-storage";
import {
  MESSAGE_MAX_FILE_BYTES,
  MESSAGE_MAX_VIDEO_BYTES,
} from "@/lib/message-attachments";

function allowedContentType(contentType: string) {
  if (
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType.startsWith("audio/")
  ) {
    return true;
  }
  return [
    "application/pdf",
    "application/zip",
    "application/octet-stream",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(contentType);
}

/** Signed upload URL so GIFs and videos go straight to MinIO or Supabase. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudStorageConfigured()) {
    return Response.json({ error: "File storage is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const filename = typeof body.filename === "string" ? body.filename : "file";
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "application/octet-stream";
  const size = typeof body.size === "number" ? body.size : 0;

  if (!size || size <= 0) {
    return Response.json({ error: "Invalid file size" }, { status: 400 });
  }

  if (!allowedContentType(contentType)) {
    return Response.json({ error: "That file type is not allowed." }, { status: 400 });
  }

  const maxBytes = contentType.startsWith("video/")
    ? MESSAGE_MAX_VIDEO_BYTES
    : MESSAGE_MAX_FILE_BYTES;
  if (size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return Response.json({ error: `File is too large (max ${maxMb} MB).` }, { status: 400 });
  }

  const ext = path.extname(filename).slice(0, 12);
  const storagePath = `messages/${session.user.id}/${uuidv4()}${ext}`;

  try {
    const signed = await createSignedUpload({
      storagePath,
      contentType,
      upsert: false,
    });
    return Response.json({
      signedUrl: signed.signedUrl,
      path: signed.path,
      publicUrl: signed.publicUrl,
      token: signed.token,
      contentType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload sign failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
