import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HostLoginForm } from "@/app/host/HostLoginForm";

export default async function MobileHostLoginPage() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    redirect("/m/admin");
  }

  return <HostLoginForm mobileApp />;
}
