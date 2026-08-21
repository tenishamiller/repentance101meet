import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";

const bodySchema = z.object({
  email: z.string().email(),
  mobileApp: z.boolean().optional(),
  fromHost: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const result = await requestPasswordReset(parsed.data.email, {
    mobileApp: parsed.data.mobileApp === true,
    fromHost: parsed.data.fromHost === true,
  });
  return Response.json(result);
}
