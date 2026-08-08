import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function saveUserImage(
  userId: string,
  file: File,
  folder: "avatars" | "uploads" = "uploads",
): Promise<{ url: string } | { error: string; status: number }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, WebP, or GIF image.", status: 400 };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return { error: "Image too large (max 5 MB).", status: 400 };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name) || ".jpg";
  const filename =
    folder === "avatars"
      ? `avatars/${userId}/${uuidv4()}${ext}`
      : `${userId}/${uuidv4()}${ext}`;

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdmin()!;
    const { error } = await supabase.storage
      .from("uploads")
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (error) {
      return { error: error.message || "Upload failed. Check Supabase storage bucket.", status: 500 };
    }

    const { data } = supabase.storage.from("uploads").getPublicUrl(filename);
    return { url: data.publicUrl };
  }

  const localName = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, localName), buffer);

  return { url: `/uploads/${folder}/${localName}` };
}
