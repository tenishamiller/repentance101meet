import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandDivider } from "@/components/BrandDivider";
import { ChannelDirectory } from "@/components/channels/ChannelDirectory";

export const dynamic = "force-dynamic";

export default async function MobileChannelsPage() {
  const session = await auth();
  if (!session) redirect("/m/login");

  if (session.user.status === "PENDING" && session.user.role !== "ADMIN") {
    redirect("/m/messages");
  }

  const channels = await prisma.channel.findMany({ orderBy: { name: "asc" } });
  const memberships =
    session.user.role === "ADMIN"
      ? []
      : await prisma.channelMembership.findMany({
          where: { userId: session.user.id },
          select: { channelId: true, status: true, requestedAt: true },
        });

  const membershipMap = new Map(
    memberships.map((membership) => [
      membership.channelId,
      { status: membership.status, requestedAt: membership.requestedAt },
    ]),
  );

  return (
    <div className="px-4 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-muted">
        Fellowship
      </p>
      <h1 className="font-serif text-2xl font-bold text-burgundy">Member Channels</h1>
      <BrandDivider className="my-3 max-w-xs" />
      <p className="text-sm text-burgundy/70">
        Join accountability, tough Q&amp;A, and general chat rooms.
      </p>

      <div className="mt-6">
        <ChannelDirectory
          channels={channels}
          membershipMap={membershipMap}
          isAdmin={session.user.role === "ADMIN"}
          basePath="/m"
        />
      </div>
    </div>
  );
}
