import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MemberLoginForm } from "@/app/login/MemberLoginForm";

export default async function MobileLoginPage() {
  const session = await auth();

  if (session?.user?.role === "ADMIN") {
    redirect("/m/admin");
  }

  if (session?.user?.status === "APPROVED") {
    redirect("/m/dashboard");
  }

  if (session?.user?.status === "PENDING") {
    redirect("/m/messages");
  }

  return <MemberLoginForm mobileApp />;
}
