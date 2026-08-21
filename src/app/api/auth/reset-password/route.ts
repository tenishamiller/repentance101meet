import { z } from "zod";
import { resetPasswordWithToken } from "@/lib/password-reset";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { token, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return Response.json({ error: "New password and confirmation do not match." }, { status: 400 });
  }

  const result = await resetPasswordWithToken(token, newPassword);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ success: true });
}
