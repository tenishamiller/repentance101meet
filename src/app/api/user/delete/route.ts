import { NextRequest } from "next/server";
import { getActiveSession } from "@/lib/auth";
import { softDeleteUser } from "@/lib/user-deletion";

export async function DELETE(request: NextRequest) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  if (session.user.role === "ADMIN") {
    return Response.json({ error: "Admin account cannot be deleted" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const confirm = typeof body.confirm === "string" ? body.confirm.trim().toLowerCase() : "";
  if (confirm !== "confirm") {
    return Response.json(
      { error: 'Type "confirm" to permanently delete your profile.' },
      { status: 400 },
    );
  }

  await softDeleteUser(
    session.user.id,
    session.user.id,
    "Member requested account removal",
  );

  return Response.json({ success: true });
}
