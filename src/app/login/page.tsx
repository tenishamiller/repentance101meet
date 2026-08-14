import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { MemberLoginForm } from "./MemberLoginForm";

export default async function LoginPage({
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
    redirect("/admin");
  }

  if (session?.user?.status === "APPROVED") {
    redirect("/dashboard");
  }

  if (session?.user?.status === "PENDING") {
    redirect(session.user.questionnaireCompleted ? "/messages" : "/signup");
  }

  return (
    <Suspense>
      <MemberLoginForm />
    </Suspense>
  );
}
