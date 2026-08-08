import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MembershipMessageCenter } from "@/components/messages/MembershipMessageCenter";

export const dynamic = "force-dynamic";

export default async function MobileMessagesPage() {
  const session = await auth();
  if (!session) redirect("/m/login");
  if (session.user.role === "ADMIN") redirect("/m/admin?tab=messages");
  if (session.user.status === "APPROVED") redirect("/m/dashboard");
  return <MembershipMessageCenter />;
}
