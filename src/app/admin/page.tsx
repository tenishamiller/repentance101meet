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
  ChannelSummary,
  DashboardStats,
  Member,
  Meeting,
} from "@/components/admin/types";

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState("Repentance 101 Teaching");
  const [generatedLinkToken, setGeneratedLinkToken] = useState("");

  const fetchAll = useCallback(async () => {
    const [dashRes, membersRes, blocksRes, meetingsRes, channelsRes] = await Promise.all([
      fetch("/api/admin/dashboard"),
      fetch("/api/admin/members"),
      fetch("/api/admin/blocks"),
      fetch("/api/admin/meetings"),
      fetch("/api/admin/channels"),
    ]);

    if (dashRes.ok) {
      setStats(await dashRes.json());
    }
    if (membersRes.ok) {
      const data = await membersRes.json();
      setAllMembers(data.members);
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

  async function approveMember(userId: string) {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: "APPROVED" }),
    });
    void fetchAll();
  }

  async function rejectMember(userId: string) {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: "REJECTED" }),
    });
    void fetchAll();
  }

  async function handleChannelRequest(membershipId: string, status: "APPROVED" | "DENIED") {
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

  async function meetingAction(meetingId: string, action: "start" | "end") {
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

  const approvedMembers = allMembers.filter((m) => m.status === "APPROVED");

  return (
    <AdminShell activeTab={tab} onTabChange={setTab} badges={badges}>
      {tab === "overview" && (
        <AdminOverview stats={stats} onGoTo={setTab} />
      )}

      {tab === "members" && (
        <AdminMembersPanel
          pendingMembers={stats.pendingMembers}
          allMembers={allMembers}
          onApprove={approveMember}
          onReject={rejectMember}
          onBlock={(userId) => void blockUser(userId)}
        />
      )}

      {tab === "channels" && (
        <AdminChannelsPanel
          pendingRequests={stats.pendingChannelRequests}
          channels={channels}
          onApproveRequest={(id) => void handleChannelRequest(id, "APPROVED")}
          onDenyRequest={(id) => void handleChannelRequest(id, "DENIED")}
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
          approvedMembers={approvedMembers}
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
