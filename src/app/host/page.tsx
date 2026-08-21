import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HostLoginForm } from "./HostLoginForm";

export default async function HostLoginPage() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <Suspense>
      <HostLoginForm />
    </Suspense>
  );
}
