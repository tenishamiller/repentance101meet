import {
  meetingChatFileSizeError,
  meetingChatFileTooLarge,
} from "@/lib/chat-attachments";

export async function uploadMeetingChatFile(
  meetingToken: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (meetingChatFileTooLarge(file.size)) {
    return { error: meetingChatFileSizeError() };
  }

  const signRes = await fetch(`/api/meetings/${meetingToken}/chat/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });

  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok) {
    return {
      error: typeof signData.error === "string" ? signData.error : "Could not upload file",
    };
  }

  const contentType = file.type || "application/octet-stream";

  if (signData.signedUrl) {
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

  if (signData.path && signData.token) {
    const { createSupabaseBrowser, isSupabaseBrowserConfigured } = await import(
      "@/lib/supabase-browser"
    );
    if (!isSupabaseBrowserConfigured()) {
      return { error: "File storage is not configured" };
    }
    const supabase = createSupabaseBrowser()!;
    const { error } = await supabase.storage
      .from("uploads")
      .uploadToSignedUrl(signData.path, signData.token, file, {
        contentType,
        upsert: false,
      });
    if (error) {
      return { error: error.message || "Upload failed" };
    }
    if (typeof signData.publicUrl === "string") {
      return { url: signData.publicUrl };
    }
  }

  return { error: "Upload failed" };
}
