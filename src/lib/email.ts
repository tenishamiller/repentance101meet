import "server-only";

import { unquoteEnv } from "@/lib/env";
import { MINISTRY_NAME } from "@/lib/brand";

type SendPasswordResetEmailOptions = {
  to: string;
  name: string;
  resetUrl: string;
};

function getEmailFrom() {
  const configured = unquoteEnv(process.env.EMAIL_FROM);
  if (configured) return configured;

  const appName = unquoteEnv(process.env.NEXT_PUBLIC_APP_NAME) || MINISTRY_NAME;
  return `${appName} <noreply@repentance101ministry.com>`;
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailOptions) {
  const apiKey = unquoteEnv(process.env.RESEND_API_KEY);
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is not configured; password reset email skipped");
    return { ok: false as const, reason: "not_configured" as const };
  }

  const appName = unquoteEnv(process.env.NEXT_PUBLIC_APP_NAME) || MINISTRY_NAME;
  const subject = `Reset your ${appName} password`;
  const text = [
    `Hello ${name},`,
    "",
    `We received a request to reset the password for your ${appName} account.`,
    "Use the link below to choose a new password. This link expires in one hour.",
    "",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hello ${escapeHtml(name)},</p>
    <p>We received a request to reset the password for your ${escapeHtml(appName)} account.</p>
    <p>Use the button below to choose a new password. This link expires in one hour.</p>
    <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 20px;background:#6B2D2D;color:#FEF9F0;text-decoration:none;border-radius:8px;font-weight:600;">Reset password</a></p>
    <p>If the button does not work, copy and paste this link into your browser:</p>
    <p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[email] Resend rejected password reset email:", response.status, detail);
    return { ok: false as const, reason: "send_failed" as const };
  }

  return { ok: true as const };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
