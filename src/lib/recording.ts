/** Best recording MIME type the browser supports (prefers MP4 when available). */
export function getRecordingMimeType(): string {
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

export function getRecordingExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

export function buildRecordingFilename(title: string, mimeType: string): string {
  const safe = title
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "teaching";
  const date = new Date().toISOString().slice(0, 10);
  return `repentance101-${safe}-${date}.${getRecordingExtension(mimeType)}`;
}

export async function uploadRecordingBlob(
  meetingToken: string,
  blob: Blob,
  filename: string,
): Promise<{ downloadUrl: string; publicUrl: string }> {
  const signRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType: blob.type }),
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not prepare recording upload");
  }

  const { signedUrl, publicUrl, path, token } = await signRes.json();

  if (signedUrl) {
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    if (!uploadRes.ok) {
      throw new Error("Recording upload failed");
    }
  } else if (token && path) {
    const form = new FormData();
    form.append("file", blob, filename);
    form.append("path", path);
    form.append("token", token);
    const uploadRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
      method: "PUT",
      body: form,
    });
    if (!uploadRes.ok) {
      throw new Error("Recording upload failed");
    }
    const data = await uploadRes.json();
    return { downloadUrl: data.publicUrl, publicUrl: data.publicUrl };
  } else {
    const form = new FormData();
    form.append("file", blob, filename);
    const uploadRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
      method: "PUT",
      body: form,
    });
    if (!uploadRes.ok) {
      throw new Error("Recording upload failed");
    }
    const data = await uploadRes.json();
    return { downloadUrl: data.publicUrl, publicUrl: data.publicUrl };
  }

  const completeRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicUrl, path }),
  });

  if (!completeRes.ok) {
    throw new Error("Could not save recording link");
  }

  const complete = await completeRes.json();
  return { downloadUrl: complete.recordingUrl, publicUrl: complete.recordingUrl };
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
