/** WebM-only recording MIME types (Norman prefers .webm downloads). */
export function getRecordingMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

/** Livestream recordings are always saved and downloaded as WebM. */
export function getRecordingExtension(_mimeType?: string) {
  return "webm";
}

export function buildRecordingFilename(title: string, _mimeType?: string) {
  const safe = title
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "teaching";
  const date = new Date().toISOString().slice(0, 10);
  return `repentance101-${safe}-${date}.webm`;
}

export const RECORDING_CONTENT_TYPE = "video/webm";

/** Vercel serverless request body limit — larger recordings must upload direct to Supabase. */
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

/** Upload using Supabase signed URL (FormData PUT — matches storage-js, no anon key required). */
async function uploadToSupabaseSignedUrl(
  signedUrl: string,
  blob: Blob,
  filename: string,
): Promise<void> {
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", blob, filename);

  const res = await fetch(signedUrl, {
    method: "PUT",
    body: form,
    headers: { "x-upsert": "true" },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Signed upload failed (${res.status})`);
  }
}

async function uploadViaSignedUrl(
  meetingToken: string,
  blob: Blob,
  filename: string,
): Promise<{ downloadUrl: string; publicUrl: string }> {
  const signRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType: RECORDING_CONTENT_TYPE }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not prepare recording upload");
  }

  const { signedUrl, path, publicUrl, token } = await signRes.json();
  if (!publicUrl) {
    throw new Error("Storage is not configured for cloud recordings");
  }

  const errors: string[] = [];

  if (signedUrl) {
    try {
      await uploadToSupabaseSignedUrl(signedUrl, blob, filename);
      return { downloadUrl: publicUrl, publicUrl };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Signed URL upload failed");
    }
  }

  if (path && token) {
    try {
      const { createSupabaseBrowser, isSupabaseBrowserConfigured } = await import(
        "@/lib/supabase-browser"
      );
      if (!isSupabaseBrowserConfigured()) {
        throw new Error("Supabase browser client is not configured");
      }
      const supabase = createSupabaseBrowser()!;
      const { error } = await supabase.storage.from("uploads").uploadToSignedUrl(path, token, blob, {
        contentType: RECORDING_CONTENT_TYPE,
        upsert: true,
      });
      if (error) throw new Error(error.message);
      return { downloadUrl: publicUrl, publicUrl };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "SDK upload failed");
    }
  }

  throw new Error(errors.join(" · ") || "Recording upload failed");
}

export async function uploadRecordingBlob(
  meetingToken: string,
  blob: Blob,
  filename: string,
): Promise<{ downloadUrl: string; publicUrl: string }> {
  // Direct-to-Supabase upload supports large teaching recordings (Vercel caps server uploads at ~4.5 MB).
  try {
    return await uploadViaSignedUrl(meetingToken, blob, filename);
  } catch (signedError) {
    if (blob.size <= SERVER_UPLOAD_MAX_BYTES) {
      try {
        return await uploadViaServer(meetingToken, blob, filename);
      } catch {
        throw signedError;
      }
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
