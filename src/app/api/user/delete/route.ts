import { auth } from "@/lib/auth";
import { softDeleteUser } from "@/lib/user-deletion";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    return Response.json({ error: "Admin account cannot be deleted" }, { status: 400 });
  }

  await softDeleteUser(
    session.user.id,
    session.user.id,
    "Member requested account removal",
  );

  return Response.json({ success: true });
}
