/** Best recording MIME type the browser supports (prefers WebM — widest MediaRecorder support). */
export function getRecordingMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

export function getRecordingExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

export function buildRecordingFilename(title: string, mimeType: string) {
  const safe = title
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "teaching";
  const date = new Date().toISOString().slice(0, 10);
  return `repentance101-${safe}-${date}.${getRecordingExtension(mimeType)}`;
}

const SERVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

async function uploadViaServer(
  meetingToken: string,
  blob: Blob,
  filename: string,
): Promise<{ downloadUrl: string; publicUrl: string }> {
  const form = new FormData();
  form.append("file", blob, filename);
  const res = await fetch(`/api/meetings/${meetingToken}/recording`, {
    method: "PUT",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Server upload failed (${res.status})`);
  }
  const data = await res.json();
  return { downloadUrl: data.publicUrl, publicUrl: data.publicUrl };
}

async function uploadViaSignedUrl(
  meetingToken: string,
  blob: Blob,
  filename: string,
): Promise<{ downloadUrl: string; publicUrl: string }> {
  const { createSupabaseBrowser, isSupabaseBrowserConfigured } = await import(
    "@/lib/supabase-browser"
  );

  const signRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType: blob.type || "video/webm" }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not prepare recording upload");
  }

  const { path, publicUrl, token } = await signRes.json();
  if (!path || !publicUrl || !token) {
    throw new Error("Storage is not configured for cloud recordings");
  }

  if (!isSupabaseBrowserConfigured()) {
    throw new Error("Supabase is not configured in the browser");
  }

  const supabase = createSupabaseBrowser()!;
  const { error } = await supabase.storage.from("uploads").uploadToSignedUrl(path, token, blob, {
    contentType: blob.type || "video/webm",
  });

  if (error) {
    throw new Error(error.message);
  }

  return { downloadUrl: publicUrl, publicUrl };
}

export async function uploadRecordingBlob(
  meetingToken: string,
  blob: Blob,
  filename: string,
): Promise<{ downloadUrl: string; publicUrl: string }> {
  if (blob.size <= SERVER_UPLOAD_MAX_BYTES) {
    try {
      return await uploadViaServer(meetingToken, blob, filename);
    } catch {
      /* fall through to signed upload for larger reliability edge cases */
    }
  }

  try {
    return await uploadViaSignedUrl(meetingToken, blob, filename);
  } catch (signedError) {
    if (blob.size <= SERVER_UPLOAD_MAX_BYTES) {
      return uploadViaServer(meetingToken, blob, filename);
    }
    throw signedError;
  }
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
