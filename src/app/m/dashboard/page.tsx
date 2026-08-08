import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileHome } from "@/components/mobile/MobileHome";

export const dynamic = "force-dynamic";

export default async function MobileDashboardPage() {
  const session = await auth();
  if (!session) redirect("/m/login");
  if (session.user.status === "PENDING" && session.user.role !== "ADMIN") {
    redirect("/m/messages");
  }
  return <MobileHome />;
}
