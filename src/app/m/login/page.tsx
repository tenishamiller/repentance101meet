import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { MemberLoginForm } from "@/app/login/MemberLoginForm";

export default async function MobileLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const next = safeCallbackUrl(callbackUrl);
  if (session && next) {
    redirect(next);
  }

  if (session?.user?.role === "ADMIN") {
    redirect("/m/admin");
  }

  if (session?.user?.status === "APPROVED") {
    redirect("/m/dashboard");
  }

  if (session?.user?.status === "PENDING") {
    redirect(session.user.questionnaireCompleted ? "/m/messages" : "/m/signup");
  }

  return (
    <Suspense>
      <MemberLoginForm mobileApp />
    </Suspense>
  );
}
