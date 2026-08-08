import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MemberLoginForm } from "./MemberLoginForm";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  if (session?.user?.status === "APPROVED") {
    redirect("/dashboard");
  }

  if (session?.user?.status === "PENDING") {
    redirect(session.user.questionnaireCompleted ? "/messages" : "/signup");
  }

  return <MemberLoginForm />;
}
