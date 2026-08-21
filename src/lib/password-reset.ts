import "server-only";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { sendPasswordResetEmail } from "@/lib/email";
import { isUserPendingDeletion } from "@/lib/user-deletion-shared";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createResetToken() {
  return randomBytes(32).toString("base64url");
}

export function buildPasswordResetUrl(
  token: string,
  options: { mobileApp?: boolean; fromHost?: boolean } = {},
) {
  const base = options.mobileApp ? "/m" : "";
  const params = new URLSearchParams({ token });
  if (options.fromHost) {
    params.set("from", "host");
  }
  return `${getAppUrl()}${base}/reset-password?${params.toString()}`;
}

/** Always returns the same public message — do not leak whether the email exists. */
export async function requestPasswordReset(
  email: string,
  options: { mobileApp?: boolean; fromHost?: boolean } = {},
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      message:
        "If an account exists for that email, we sent a link to reset your password.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      deletedAt: true,
      purgeAt: true,
    },
  });

  if (
    !user ||
    isUserPendingDeletion(user) ||
    user.status === "REJECTED"
  ) {
    return {
      message:
        "If an account exists for that email, we sent a link to reset your password.",
    };
  }

  const rawToken = createResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const resetUrl = buildPasswordResetUrl(rawToken, options);
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  return {
    message:
      "If an account exists for that email, we sent a link to reset your password.",
  };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
) {
  const tokenHash = hashResetToken(token.trim());
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          passwordHash: true,
          status: true,
          deletedAt: true,
          purgeAt: true,
        },
      },
    },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." as const };
  }

  if (
    !record.user ||
    isUserPendingDeletion(record.user) ||
    record.user.status === "REJECTED"
  ) {
    return { error: "This reset link is invalid or has expired." as const };
  }

  const samePassword = await bcrypt.compare(newPassword, record.user.passwordHash);
  if (samePassword) {
    return {
      error: "Choose a password that is different from your current password.",
    } as const;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: record.user.id,
        id: { not: record.id },
      },
    }),
  ]);

  return { success: true as const };
}
