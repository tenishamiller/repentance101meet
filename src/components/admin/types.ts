export type AdminTab =
  | "overview"
  | "members"
  | "channels"
  | "livestream"
  | "private"
  | "blocks"
  | "content";

export type PendingMember = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  avatarUrl: string | null;
};

export type Member = PendingMember & {
  status: MemberStatus;
};

export type MemberStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ChannelMembershipStatus = "PENDING" | "APPROVED" | "DENIED";

export type ChannelRequest = {
  id: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  channel: { name: string; slug: string };
};

export type Block = {
  id: string;
  reason: string | null;
  unblockedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  blockedBy?: { name: string };
};

export type Meeting = {
  id: string;
  title: string;
  linkToken: string;
  status: string;
  kind?: string;
  recordingUrl: string | null;
  createdAt: string;
  endedAt?: string | null;
  invitedUser?: { id: string; name: string; avatarUrl?: string | null } | null;
};

export type ChannelSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  content: string | null;
  approvedMembers: {
    membershipId: string;
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }[];
  pendingCount: number;
};

export type DashboardStats = {
  pendingMembers: PendingMember[];
  pendingChannelRequests: ChannelRequest[];
  deniedChannelRequests: ChannelRequest[];
  activeBlocks: Block[];
  liveMeetings: Meeting[];
  recentMeetings: Meeting[];
  approvedMemberCount: number;
  totalMemberCount: number;
  livePrivateSessions: Meeting[];
  recordings: Meeting[];
};
