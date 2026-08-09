import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PublicChannelView } from "@/components/PublicChannelView";
import { ChannelRoom } from "@/components/ChannelRoom";
import { JoinChannelRequest } from "@/components/JoinChannelRequest";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();

  const channel = await prisma.channel.findUnique({ where: { slug } });
  if (!channel) notFound();

  if (channel.type === "PUBLIC") {
    return <PublicChannelView channel={channel} />;
  }

  if (!session) redirect("/login");

  if (session.user.status === "PENDING" && session.user.role !== "ADMIN") {
    redirect("/messages");
  }

  const isAdmin = session.user.role === "ADMIN";

  if (isAdmin) {
    return <ChannelRoom channel={channel} userId={session.user.id} isAdmin />;
  }

  const membership = await prisma.channelMembership.findUnique({
    where: {
      userId_channelId: {
        userId: session.user.id,
        channelId: channel.id,
      },
    },
  });

  if (membership?.status === "APPROVED") {
    return (
      <ChannelRoom
        channel={channel}
        userId={session.user.id}
        isAdmin={false}
      />
    );
  }

  return (
    <JoinChannelRequest
      channel={channel}
      membershipStatus={membership?.status ?? null}
      requestedAt={membership?.requestedAt.toISOString() ?? null}
    />
  );
}
