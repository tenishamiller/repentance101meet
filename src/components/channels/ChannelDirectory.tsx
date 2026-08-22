import Link from "next/link";
import { MINISTRY_LEADER } from "@/lib/brand";
import { formatRequestDateTime, getChannelPublicDescription } from "@/lib/utils";
import type { Channel, MembershipStatus } from "@/generated/prisma/client";

type MembershipInfo = {
  status: MembershipStatus;
  requestedAt: Date;
};

type Props = {
  channels: Channel[];
  membershipMap: Map<string, MembershipInfo>;
  isAdmin: boolean;
  /** Prefix for links, e.g. `/m` on mobile shell. */
  basePath?: string;
};

export function ChannelDirectory({
  channels,
  membershipMap,
  isAdmin,
  basePath = "",
}: Props) {
  const privateChannels = channels.filter((channel) => channel.type !== "PUBLIC");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {privateChannels.map((channel) => {
        const membership = membershipMap.get(channel.id);
        const status = membership?.status;
        const isApproved = isAdmin || status === "APPROVED";
        const href = `${basePath}/channels/${channel.slug}`;

        return (
          <div key={channel.id} className="card-brand p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-burgundy">{channel.name}</h2>
              <span className="shrink-0 rounded-full bg-burgundy/10 px-2 py-0.5 text-xs font-medium text-burgundy">
                {channel.type === "GENERAL" ? "Chat" : "Private"}
              </span>
            </div>
            <p className="text-sm text-burgundy/70">
              {getChannelPublicDescription(channel.slug, channel.description)}
            </p>

            {isAdmin || isApproved ? (
              <Link
                href={href}
                className="mt-4 inline-block text-sm font-medium text-gold-muted hover:underline"
              >
                Enter Channel →
              </Link>
            ) : status === "PENDING" ? (
              <div className="mt-4">
                <p className="text-sm text-gold-muted">
                  Chat unavailable — pending approval. Speak with {MINISTRY_LEADER}.
                </p>
                {membership?.requestedAt && (
                  <p className="mt-1 text-xs text-burgundy/55">
                    Requested {formatRequestDateTime(membership.requestedAt)}
                  </p>
                )}
              </div>
            ) : status === "DENIED" ? (
              <p className="mt-4 text-sm text-burgundy">
                Request denied. Contact {MINISTRY_LEADER} if you believe this was an error.
              </p>
            ) : (
              <Link href={href} className="btn-primary mt-4 inline-block !px-4 !py-2 text-sm">
                Request to Join
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
