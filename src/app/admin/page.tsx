"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminMembersPanel } from "@/components/admin/AdminMembersPanel";
import { AdminChannelsPanel } from "@/components/admin/AdminChannelsPanel";
import { AdminLivestreamPanel } from "@/components/admin/AdminLivestreamPanel";
import { AdminPrivateMinistryPanel } from "@/components/admin/AdminPrivateMinistryPanel";
import { AdminBlocksPanel } from "@/components/admin/AdminBlocksPanel";
import { AdminContentPanel } from "@/components/admin/AdminContentPanel";
import type {
  AdminTab,
  Block,
  ChannelMembershipStatus,
  ChannelSummary,
  DashboardStats,
  MemberStatus,
  Meeting,
} from "@/components/admin/types";

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState("Repentance 101 Teaching");
  const [generatedLinkToken, setGeneratedLinkToken] = useState("");
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);

  const fetchAll = useCallback(async () => {
    const [dashRes, blocksRes, meetingsRes, channelsRes] = await Promise.all([
      fetch("/api/admin/dashboard"),
      fetch("/api/admin/blocks"),
      fetch("/api/admin/meetings"),
      fetch("/api/admin/channels"),
    ]);

    if (dashRes.ok) {
      setStats(await dashRes.json());
    }
    if (blocksRes.ok) {
      const data = await blocksRes.json();
      setBlocks(data.blocks);
    }
    if (meetingsRes.ok) {
      const data = await meetingsRes.json();
      setMeetings(data.meetings);
    }
    if (channelsRes.ok) {
      const data = await channelsRes.json();
      setChannels(data.channels);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => void fetchAll(), 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  async function setMemberStatus(userId: string, status: MemberStatus) {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    setMembersRefreshKey((k) => k + 1);
    void fetchAll();
  }

  async function setChannelRequestStatus(membershipId: string, status: ChannelMembershipStatus) {
    await fetch("/api/admin/channel-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, status }),
    });
    void fetchAll();
  }

  async function removeFromChannel(membershipId: string) {
    await fetch("/api/admin/channel-requests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId }),
    });
    void fetchAll();
  }

  async function createMeeting() {
    const res = await fetch("/api/admin/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newMeetingTitle }),
    });
    const data = await res.json();
    if (res.ok) {
      setGeneratedLinkToken(data.meeting.linkToken);
      void fetchAll();
    }
  }

  async function meetingAction(
    meetingId: string,
    action: "start" | "end" | "delete" | "undo-delete",
  ) {
    await fetch("/api/admin/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, action }),
    });
    void fetchAll();
  }

  async function blockUser(userId: string, reason?: string) {
    await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reason: reason || undefined }),
    });
    void fetchAll();
  }

  async function unblockUser(blockId: string) {
    await fetch("/api/admin/blocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId }),
    });
    void fetchAll();
  }

  if (loading || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-gold/30" />
          <p className="font-serif text-burgundy/60">Loading admin console...</p>
        </div>
      </div>
    );
  }

  const badges: Partial<Record<AdminTab, number>> = {
    members: stats.pendingMembers.length,
    channels: stats.pendingChannelRequests.length,
    blocks: stats.activeBlocks.length,
  };

  return (
    <AdminShell activeTab={tab} onTabChange={setTab} badges={badges}>
      {tab === "overview" && (
        <AdminOverview stats={stats} onGoTo={setTab} />
      )}

      {tab === "members" && (
        <AdminMembersPanel
          pendingMembers={stats.pendingMembers}
          onStatusChange={(userId, status) => void setMemberStatus(userId, status)}
          onBlock={(userId) => void blockUser(userId)}
          refreshKey={membersRefreshKey}
        />
      )}

      {tab === "channels" && (
        <AdminChannelsPanel
          pendingRequests={stats.pendingChannelRequests}
          deniedRequests={stats.deniedChannelRequests}
          channels={channels}
          onStatusChange={(id, status) => void setChannelRequestStatus(id, status)}
          onRemoveMember={removeFromChannel}
        />
      )}

      {tab === "livestream" && (
        <AdminLivestreamPanel
          meetings={meetings}
          recordings={stats.recordings}
          newMeetingTitle={newMeetingTitle}
          onTitleChange={setNewMeetingTitle}
          onCreateMeeting={() => void createMeeting()}
          generatedLinkToken={generatedLinkToken}
          onMeetingAction={meetingAction}
        />
      )}

      {tab === "private" && <AdminPrivateMinistryPanel />}

      {tab === "blocks" && (
        <AdminBlocksPanel
          blocks={blocks}
          onUnblock={unblockUser}
          onBlock={(userId, reason) => void blockUser(userId, reason)}
        />
      )}

      {tab === "content" && (
        <AdminContentPanel channels={channels} onRefresh={fetchAll} />
      )}
    </AdminShell>
  );
}
