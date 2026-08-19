import {
  attachmentTypeForFile,
  fileTooLargeError,
  maxBytesForFile,
} from "@/lib/message-attachments";
import type { Attachment } from "@/lib/utils";

async function uploadWithSignedUrl(file: File): Promise<{ url: string } | { error: string } | null> {
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });

  if (signRes.status === 503) return null;
  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) {
    return {
      error: typeof signData.error === "string" ? signData.error : "Could not upload file.",
    };
  }

  const contentType = file.type || "application/octet-stream";

  if (typeof signData.signedUrl === "string") {
    const putRes = await fetch(signData.signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": contentType,
        "x-upsert": "false",
      },
    });
    if (!putRes.ok) {
      return { error: "Upload failed. Try a smaller file." };
    }
    if (typeof signData.publicUrl === "string") {
      return { url: signData.publicUrl };
    }
  }

  return { error: "Upload failed" };
}

async function uploadThroughApi(file: File): Promise<{ url: string } | { error: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: typeof data.error === "string" ? data.error : "Could not upload file.",
    };
  }
  if (typeof data.url !== "string") {
    return { error: "Could not upload file." };
  }
  return { url: data.url };
}

export async function uploadDirectFile(file: File): Promise<{ url: string } | { error: string }> {
  if (file.size > maxBytesForFile(file)) {
    return { error: fileTooLargeError(file) };
  }

  const signed = await uploadWithSignedUrl(file);
  if (signed) return signed;
  return uploadThroughApi(file);
}

export async function uploadDirectAttachment(file: File): Promise<Attachment | { error: string }> {
  const uploaded = await uploadDirectFile(file);
  if ("error" in uploaded) return uploaded;
  return {
    type: attachmentTypeForFile(file),
    url: uploaded.url,
    name: file.name,
  };
}
