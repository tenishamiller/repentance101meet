"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { ShowMoreList } from "@/components/ShowMoreList";
import { formatRequestDateTime } from "@/lib/utils";
import { ListPagination } from "./ListPagination";
import { MEMBER_STATUS_OPTIONS, StatusToggle } from "./StatusToggle";
import { MemberDetailPanel } from "./MemberDetailPanel";
import type { Member, MemberStatus, PendingMember } from "./types";

type Props = {
  pendingMembers: PendingMember[];
  onStatusChange: (userId: string, status: MemberStatus) => void;
  onBlock: (userId: string) => void;
  refreshKey?: number;
};

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "bg-gold/20 text-burgundy",
  PENDING: "bg-burgundy/10 text-burgundy",
  REJECTED: "bg-stone-200 text-stone-600",
};

const PAGE_SIZE = 25;

export function AdminMembersPanel({
  pendingMembers,
  onStatusChange,
  onBlock,
  refreshKey = 0,
}: Props) {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | MemberStatus>("ALL");
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status: statusFilter,
      });
      if (filter.trim()) params.set("q", filter.trim());

      const res = await fetch(`/api/admin/members?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, page, statusFilter]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [filter, statusFilter]);

  return (
    <div className="space-y-8 animate-fade-up">
      {detailUserId && (
        <MemberDetailPanel userId={detailUserId} onClose={() => setDetailUserId(null)} />
      )}
      <section className="card-brand p-6">
        <h2 className="mb-1 font-serif text-xl font-semibold text-burgundy">
          Pending Memberships
        </h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Approve or deny new signups. Use the status toggle to change your decision anytime.
        </p>
        {pendingMembers.length === 0 ? (
          <p className="rounded-xl bg-cream-dark px-4 py-6 text-center text-burgundy/60">
            No pending membership requests — all caught up!
          </p>
        ) : (
          <ShowMoreList
            items={pendingMembers}
            initialCount={5}
            step={5}
            listClassName="space-y-3"
            moreLabel="requests"
            getKey={(m) => m.id}
            renderItem={(m) => (
              <div className="flex flex-col gap-4 rounded-xl border border-gold/25 bg-cream-dark p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="md" />
                  <div>
                    <button
                      type="button"
                      onClick={() => setDetailUserId(m.id)}
                      className="text-left font-semibold text-burgundy hover:text-gold-muted hover:underline"
                    >
                      {m.name}
                    </button>
                    <p className="text-sm text-burgundy/60">{m.email}</p>
                    <p className="text-xs text-burgundy/50">
                      Requested {formatRequestDateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusToggle
                  value="PENDING"
                  options={MEMBER_STATUS_OPTIONS}
                  onChange={(status) => onStatusChange(m.id, status)}
                />
              </div>
            )}
          />
        )}
      </section>

      <section className="card-brand p-6">
        <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">Member Directory</h2>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-burgundy/40" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by name or email..."
              className="input-field !pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input-field sm:w-44"
          >
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Denied</option>
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-burgundy/60">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="text-burgundy/60">No members match your search.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gold/20 text-burgundy/60">
                    <th className="pb-3 pr-4 font-semibold">Member</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 font-semibold">
                    {statusFilter === "PENDING" ? "Requested" : "Joined"}
                  </th>
                    <th className="pb-3 font-semibold">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-gold/10 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            userId={m.id}
                            name={m.name}
                            avatarUrl={m.avatarUrl}
                            size="sm"
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() => setDetailUserId(m.id)}
                              className="text-left font-medium text-burgundy hover:text-gold-muted hover:underline"
                            >
                              {m.name}
                            </button>
                            <p className="text-xs text-burgundy/55">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status] ?? ""}`}
                        >
                          {m.status === "REJECTED" ? "DENIED" : m.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-burgundy/60">
                        {formatRequestDateTime(m.createdAt)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <StatusToggle
                            value={m.status as MemberStatus}
                            options={MEMBER_STATUS_OPTIONS}
                            onChange={(status) => onStatusChange(m.id, status)}
                            size="sm"
                          />
                          {m.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => onBlock(m.id)}
                              className="rounded-lg border border-burgundy/30 px-2.5 py-1 text-xs font-semibold text-burgundy hover:bg-burgundy/10"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
