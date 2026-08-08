import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { saveUserImage } from "@/lib/upload-image";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

async function saveGenericFile(userId: string, file: File): Promise<{ url: string } | { error: string; status: number }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name) || "";
  const filename = `${userId}/${uuidv4()}${ext}`;

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdmin()!;
    const { error } = await supabase.storage
      .from("uploads")
      .upload(filename, buffer, { contentType: file.type || "application/octet-stream", upsert: false });

    if (error) {
      return { error: error.message, status: 500 };
    }

    const { data } = supabase.storage.from("uploads").getPublicUrl(filename);
    return { url: data.publicUrl };
  }

  const localName = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, localName), buffer);
  return { url: `/uploads/${localName}` };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const saved = file.type.startsWith("image/")
    ? await saveUserImage(session.user.id, file, "uploads")
    : await saveGenericFile(session.user.id, file);

  if ("error" in saved) {
    return Response.json({ error: saved.error }, { status: saved.status });
  }

  return Response.json({ url: saved.url });
}
