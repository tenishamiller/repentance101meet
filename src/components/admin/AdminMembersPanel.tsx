"use client";

import { useState } from "react";
import { Search, UserCheck, UserX } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import type { Member, PendingMember } from "./types";

type Props = {
  pendingMembers: PendingMember[];
  allMembers: Member[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onBlock: (userId: string) => void;
};

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "bg-gold/20 text-burgundy",
  PENDING: "bg-burgundy/10 text-burgundy",
  REJECTED: "bg-stone-200 text-stone-600",
};

export function AdminMembersPanel({
  pendingMembers,
  allMembers,
  onApprove,
  onReject,
  onBlock,
}: Props) {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "PENDING" | "REJECTED">(
    "ALL",
  );

  const filtered = allMembers.filter((m) => {
    const q = filter.toLowerCase();
    const matchesSearch =
      !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Pending */}
      <section className="card-brand p-6">
        <h2 className="mb-1 font-serif text-xl font-semibold text-burgundy">
          Pending Memberships
        </h2>
        <p className="mb-4 text-sm text-burgundy/60">
          New signups must be approved before they can access channels and meetings.
        </p>
        {pendingMembers.length === 0 ? (
          <p className="rounded-xl bg-cream-dark px-4 py-6 text-center text-burgundy/60">
            No pending membership requests — all caught up!
          </p>
        ) : (
          <div className="space-y-3">
            {pendingMembers.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-4 rounded-xl border border-gold/25 bg-cream-dark p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="md" />
                  <div>
                    <p className="font-semibold text-burgundy">{m.name}</p>
                    <p className="text-sm text-burgundy/60">{m.email}</p>
                    <p className="text-xs text-burgundy/50">Signed up {formatDate(m.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(m.id)}
                    className="btn-primary inline-flex items-center gap-1.5 !px-4 !py-2 text-sm"
                  >
                    <UserCheck className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(m.id)}
                    className="btn-outline-gold inline-flex items-center gap-1.5 !px-4 !py-2 text-sm"
                  >
                    <UserX className="h-4 w-4" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Directory */}
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
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-burgundy/60">No members match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gold/20 text-burgundy/60">
                  <th className="pb-3 pr-4 font-semibold">Member</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 font-semibold">Joined</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-gold/10 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <UserAvatar userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                        <div>
                          <p className="font-medium text-burgundy">{m.name}</p>
                          <p className="text-xs text-burgundy/55">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status] ?? ""}`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-burgundy/60">{formatDate(m.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {m.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => onApprove(m.id)}
                              className="rounded-lg bg-gold/20 px-2.5 py-1 text-xs font-semibold text-burgundy hover:bg-gold/30"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onReject(m.id)}
                              className="rounded-lg border border-burgundy/20 px-2.5 py-1 text-xs font-semibold text-burgundy hover:bg-burgundy/5"
                            >
                              Deny
                            </button>
                          </>
                        )}
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
        )}
      </section>
    </div>
  );
}
