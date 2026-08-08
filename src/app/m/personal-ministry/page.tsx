import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PersonalMinistryHub } from "@/components/private-ministry/PersonalMinistryHub";

export default async function MobilePersonalMinistryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/m/login?callbackUrl=/m/personal-ministry");
  }

  if (session.user.status !== "APPROVED" && session.user.role !== "ADMIN") {
    redirect("/m/messages");
  }

  return (
    <PersonalMinistryHub
      isAdmin={session.user.role === "ADMIN"}
      userName={session.user.name ?? "Member"}
    />
  );
}
