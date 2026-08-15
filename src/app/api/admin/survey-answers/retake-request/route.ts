import { z } from "zod";
import { auth } from "@/lib/auth";
import { sendQuestionnaireRetakeRequest } from "@/lib/questionnaire-retake";

const bodySchema = z.object({
  userId: z.string().min(1),
  resend: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const result = await sendQuestionnaireRetakeRequest(session.user.id, body.userId, {
      resend: body.resend === true,
    });
    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send retake request";
    return Response.json({ error: message }, { status: 400 });
  }
}
