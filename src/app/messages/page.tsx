import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MembershipMessageCenter } from "@/components/messages/MembershipMessageCenter";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin?tab=messages");

  return <MembershipMessageCenter />;
}
