import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";
import { permanentlyDeleteUser, purgeExpiredUsers } from "@/lib/user-deletion";
import { isUserPendingDeletion } from "@/lib/user-deletion-shared";

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = signupSchema.parse(body);

    await purgeExpiredUsers();

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      if (isUserPendingDeletion(existing)) {
        return Response.json(
          {
            error:
              "This email was removed from the ministry. Please contact leadership directly if you believe this was a mistake.",
          },
          { status: 400 },
        );
      }

      if (existing.deletedAt) {
        await permanentlyDeleteUser(existing.id);
      } else {
        return Response.json({ error: "Email already registered" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: "MEMBER",
        status: "PENDING",
      },
    });

    await logMemberActivity({
      userId: user.id,
      type: "JOINED",
      label: "Joined ministry (membership pending approval)",
    });

    return Response.json({
      message:
        "Account created! Your membership request will be reviewed soon.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Email already registered" }, { status: 400 });
    }
    return Response.json({ error: "Signup failed" }, { status: 500 });
  }
}
