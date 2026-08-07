import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PersonalMinistryHub } from "@/components/private-ministry/PersonalMinistryHub";

export default async function PersonalMinistryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/personal-ministry");
  }

  if (session.user.status !== "APPROVED" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <PersonalMinistryHub
      isAdmin={session.user.role === "ADMIN"}
      userName={session.user.name ?? "Member"}
    />
  );
}
