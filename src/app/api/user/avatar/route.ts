import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveUserImage } from "@/lib/upload-image";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No image selected" }, { status: 400 });
  }

  const saved = await saveUserImage(session.user.id, file, "avatars");
  if ("error" in saved) {
    return Response.json({ error: saved.error }, { status: saved.status });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: saved.url },
  });

  return Response.json({
    avatarUrl: user.avatarUrl,
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
  });
}
