import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileHome } from "@/components/mobile/MobileHome";

export const dynamic = "force-dynamic";

export default async function MobileRootPage() {
  const session = await auth();
  if (session?.user?.status === "PENDING" && session.user.role !== "ADMIN") {
    redirect("/m/messages");
  }
  return <MobileHome />;
}
