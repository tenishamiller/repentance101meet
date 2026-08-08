import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  DELETED_MEMBER_LOGIN_MESSAGE,
  purgeExpiredUsers,
} from "@/lib/user-deletion";
import { isUserPendingDeletion } from "@/lib/user-deletion-shared";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Returns a specific login message when credentials match a removed account. */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    await purgeExpiredUsers();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return Response.json({ message: null });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return Response.json({ message: null });
    }

    if (isUserPendingDeletion(user)) {
      return Response.json({ message: DELETED_MEMBER_LOGIN_MESSAGE });
    }

    if (user.status === "REJECTED") {
      return Response.json({
        message:
          "Your membership was not approved. Please contact ministry leadership directly.",
      });
    }

    return Response.json({ message: null });
  } catch {
    return Response.json({ message: null });
  }
}
