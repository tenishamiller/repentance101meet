"use client";

import { Pencil, Trash2, Video, Copy, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { MessageAttachments } from "@/components/livestream/MessageAttachments";
import { useAppPath } from "@/hooks/useAppBase";
import { isMessageEdited, getEditTimeRemaining } from "@/lib/channel-messages";
import { canEditMessage, cn, type Attachment } from "@/lib/utils";
import { formatRequestDateTime } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export type MembershipMessageData = {
  id: string;
  content: string;
  attachments: Attachment[] | null;
  type: "TEXT" | "ONBOARDING_INVITE" | "QUESTIONNAIRE_RETAKE" | "SYSTEM";
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  sender: { id: string; name: string; avatarUrl: string | null; role: string };
  meeting?: {
    id: string;
    linkToken: string;
    title: string;
    status: string;
    isOnboardingApproval: boolean;
  } | null;
};

type Props = {
  message: MembershipMessageData;
  isOwn: boolean;
  editingId: string | null;
  editContent: string;
  onEditContentChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  now?: number;
  allowEdit?: boolean;
  viewerIsAdmin?: boolean;
};

export function MembershipMessageBubble({
  message,
  isOwn,
  editingId,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  now = Date.now(),
  allowEdit = true,
  viewerIsAdmin = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const personalMinistryBase = useAppPath("/personal-ministry");
  const questionnairePath = useAppPath("/questionnaire");
  const isText = message.type === "TEXT";
  const canModify = allowEdit && isText && isOwn && canEditMessage(message.createdAt, now);
  const isEditing = editingId === message.id;
  const edited = isMessageEdited(message.editedAt);
  const editRemaining = canModify ? getEditTimeRemaining(message.createdAt, now) : null;

  async function copyMessage() {
    const ok = await copyTextToClipboard(message.content);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("group flex gap-3", isOwn && "flex-row-reverse")}>
      <UserAvatar
        userId={message.sender.id}
        name={message.sender.name}
        avatarUrl={message.sender.avatarUrl}
        size="md"
      />
      <div className={cn("max-w-[min(100%,36rem)]", isOwn && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            message.type === "ONBOARDING_INVITE"
              ? "border-2 border-gold bg-gold/15"
              : message.type === "QUESTIONNAIRE_RETAKE"
                ? "border-2 border-gold bg-gold/15"
                : message.type === "SYSTEM"
                ? "border border-gold/30 bg-cream-dark"
                : message.sender.role === "ADMIN"
                  ? "border border-gold/25 bg-white"
                  : "border border-gold/20 bg-cream",
          )}
        >
          {message.type === "ONBOARDING_INVITE" && (
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-burgundy">
              Membership Approval — Required One-on-One
            </p>
          )}
          {message.type === "QUESTIONNAIRE_RETAKE" && (
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-burgundy">
              Membership Questionnaire — Action Required
            </p>
          )}

          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                className="input-field text-sm"
                rows={3}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onSaveEdit}
                  className="rounded-lg bg-burgundy px-3 py-1.5 text-sm font-medium text-cream"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-lg border border-gold/30 px-3 py-1.5 text-sm text-burgundy"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.content.trim() && (
                <p className="chat-scroll-gold max-h-64 overflow-y-auto whitespace-pre-wrap pr-2 text-sm text-burgundy/90">
                  {message.content}
                </p>
              )}
              {message.attachments && message.attachments.length > 0 && (
                <MessageAttachments attachments={message.attachments} />
              )}
            </>
          )}

          {message.meeting && (
            <Link
              href={`${personalMinistryBase}/${message.meeting.linkToken}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark"
            >
              <Video className="h-4 w-4" />
              {message.meeting.status === "LIVE"
                ? "Join One-on-One Now"
                : "Open One-on-One Session"}
            </Link>
          )}

          {message.type === "QUESTIONNAIRE_RETAKE" &&
            (viewerIsAdmin ? (
              <p className="mt-3 text-xs font-medium text-burgundy/70">
                The member opens this survey from their own Messages while signed in.
              </p>
            ) : (
              <Link
                href={questionnairePath}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark"
              >
                <ClipboardList className="h-4 w-4" />
                Continue Membership Questionnaire
              </Link>
            ))}

          <div className={cn("mt-2 flex flex-wrap items-center gap-2", isOwn && "justify-end")}>
            <p className="text-[11px] text-burgundy/45">
              {formatRequestDateTime(message.createdAt)}
            </p>
            {edited && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-burgundy/45">
                Edited
              </span>
            )}
            {editRemaining && !isEditing && (
              <span className="text-[10px] text-burgundy/40">{editRemaining}</span>
            )}
          </div>
        </div>

        {(canModify || message.content.trim()) && !isEditing && (
          <div className={cn("mt-1.5 flex gap-3", isOwn && "justify-end")}>
            {message.content.trim() && (
              <button
                type="button"
                onClick={() => void copyMessage()}
                className="inline-flex items-center gap-1 text-xs font-medium text-burgundy/60 hover:text-burgundy"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            {canModify && (
              <>
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="inline-flex items-center gap-1 text-xs font-medium text-burgundy/60 hover:text-burgundy"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1 text-xs font-medium text-burgundy/60 hover:text-burgundy"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
