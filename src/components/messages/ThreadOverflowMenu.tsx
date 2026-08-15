"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreVertical, RotateCcw, Trash2 } from "lucide-react";
import { formatMessageThreadDeleteCountdown } from "@/lib/message-thread-deletion-shared";

export type DeletedThreadSummary = {
  conversationId: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  lastMessage?: { content: string; createdAt: string; type?: string } | null;
  conversation: {
    id: string;
    deletedAt: string | null;
    purgeAt: string | null;
  };
  deletedBy?: { id: string; name: string } | null;
};

type ActiveMenuProps = {
  mode: "active";
  conversationName: string;
  disabled?: boolean;
  busy?: boolean;
  onDeleteThread: () => Promise<void>;
  /** Dark livestream-style header */
  tone?: "light" | "dark";
};

type DeletedMenuProps = {
  mode: "deleted";
  conversationName: string;
  purgeAt: string | null;
  disabled?: boolean;
  busy?: boolean;
  onRestore: () => Promise<void>;
  onPermanentDelete: () => Promise<void>;
  tone?: "light" | "dark";
};

type Props = ActiveMenuProps | DeletedMenuProps;

export function ThreadOverflowMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [permanentChecked, setPermanentChecked] = useState(false);
  const [countdown, setCountdown] = useState(
    props.mode === "deleted" && props.purgeAt
      ? formatMessageThreadDeleteCountdown(props.purgeAt)
      : "",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const tone = props.tone ?? "light";
  const isDark = tone === "dark";

  useEffect(() => {
    if (!open && !confirmDelete && !confirmPermanent) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirmDelete(false);
        setConfirmPermanent(false);
        setPermanentChecked(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, confirmDelete, confirmPermanent]);

  useEffect(() => {
    if (props.mode !== "deleted" || !props.purgeAt) return;
    setCountdown(formatMessageThreadDeleteCountdown(props.purgeAt));
    const timer = window.setInterval(() => {
      setCountdown(formatMessageThreadDeleteCountdown(props.purgeAt!));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [props]);

  const triggerClass = isDark
    ? "rounded-lg p-1.5 text-gold-light/70 transition hover:bg-burgundy hover:text-gold disabled:opacity-40"
    : "rounded-lg p-1.5 text-burgundy/55 transition hover:bg-burgundy/10 hover:text-burgundy disabled:opacity-40";

  const menuClass = isDark
    ? "absolute right-0 z-30 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-gold/25 bg-burgundy-deep py-1 shadow-xl"
    : "absolute right-0 z-30 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-gold/30 bg-cream py-1 shadow-xl";

  const itemClass = isDark
    ? "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gold-light hover:bg-burgundy disabled:opacity-50"
    : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-burgundy hover:bg-gold/10 disabled:opacity-50";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Thread options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={props.disabled || props.busy}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={triggerClass}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div id={menuId} role="menu" className={menuClass}>
          {props.mode === "active" ? (
            <button
              type="button"
              role="menuitem"
              disabled={props.busy}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                setConfirmDelete(true);
              }}
              className={itemClass}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete thread
            </button>
          ) : (
            <>
              {props.purgeAt && (
                <p
                  className={
                    isDark
                      ? "border-b border-gold/15 px-3 py-2 text-[11px] text-gold-light/60"
                      : "border-b border-gold/20 px-3 py-2 text-[11px] text-burgundy/55"
                  }
                >
                  Restore window: {countdown}
                </p>
              )}
              <button
                type="button"
                role="menuitem"
                disabled={props.busy}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  void props.onRestore();
                }}
                className={itemClass}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore thread
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={props.busy}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  setPermanentChecked(false);
                  setConfirmPermanent(true);
                }}
                className={itemClass}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Permanently delete
              </button>
            </>
          )}
        </div>
      )}

      {confirmDelete && props.mode === "active" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-burgundy-deep/40 p-4 sm:items-center"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gold/30 bg-cream p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-semibold text-burgundy">Delete this thread?</h3>
            <p className="mt-2 text-sm text-burgundy/70">
              Removes the whole conversation with {props.conversationName}. You can restore it
              within 30 days. New messages after this start a fresh thread.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={props.busy}
                onClick={async () => {
                  await props.onDeleteThread();
                  setConfirmDelete(false);
                }}
                className="rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark disabled:opacity-60"
              >
                {props.busy ? "Deleting..." : "Delete thread"}
              </button>
              <button
                type="button"
                disabled={props.busy}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-burgundy/25 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPermanent && props.mode === "deleted" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-burgundy-deep/40 p-4 sm:items-center"
          onClick={() => {
            setConfirmPermanent(false);
            setPermanentChecked(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gold/30 bg-cream p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-semibold text-burgundy">
              Permanently delete thread?
            </h3>
            <p className="mt-2 text-sm text-burgundy/70">
              This permanently deletes the conversation with {props.conversationName}. It cannot
              be restored.
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm text-burgundy">
              <input
                type="checkbox"
                checked={permanentChecked}
                onChange={(event) => setPermanentChecked(event.target.checked)}
                className="mt-1"
              />
              <span>
                I understand this permanently deletes the entire conversation and it cannot be
                restored.
              </span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={props.busy || !permanentChecked}
                onClick={async () => {
                  await props.onPermanentDelete();
                  setConfirmPermanent(false);
                  setPermanentChecked(false);
                }}
                className="rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark disabled:opacity-60"
              >
                {props.busy ? "Deleting..." : "Confirm permanent delete"}
              </button>
              <button
                type="button"
                disabled={props.busy}
                onClick={() => {
                  setConfirmPermanent(false);
                  setPermanentChecked(false);
                }}
                className="rounded-lg border border-burgundy/25 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
