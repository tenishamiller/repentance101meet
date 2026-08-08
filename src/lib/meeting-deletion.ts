import { prisma } from "@/lib/db";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MEETING_DELETE_GRACE_MS } from "@/lib/meeting-deletion-shared";

export { MEETING_DELETE_GRACE_MS } from "@/lib/meeting-deletion-shared";

export function meetingPurgeAt(from = new Date()) {
  return new Date(from.getTime() + MEETING_DELETE_GRACE_MS);
}

/** Meetings that are not soft-deleted. */
export function activeMeetingFilter() {
  return { deletedAt: null };
}

/** Meetings visible in admin (active + pending permanent deletion). */
export function visibleMeetingFilter(now = new Date()) {
  return {
    OR: [{ deletedAt: null }, { purgeAt: { gt: now } }],
  };
}

function storagePathFromRecordingUrl(recordingUrl: string) {
  try {
    const pathname = new URL(recordingUrl).pathname;
    const marker = "/storage/v1/object/public/uploads/";
    const idx = pathname.indexOf(marker);
    if (idx >= 0) return decodeURIComponent(pathname.slice(idx + marker.length));
    if (recordingUrl.startsWith("/recordings/")) {
      return null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function deleteRecordingFromStorage(recordingUrl: string | null) {
  if (!recordingUrl || !isSupabaseConfigured()) return;

  const storagePath = storagePathFromRecordingUrl(recordingUrl);
  if (!storagePath) return;

  const supabase = createSupabaseAdmin()!;
  await supabase.storage.from("uploads").remove([storagePath]);
}

export async function permanentlyDeleteMeeting(
  meetingId: string,
  recordingUrl: string | null = null,
) {
  await deleteRecordingFromStorage(recordingUrl);
  await prisma.meeting.delete({ where: { id: meetingId } });
}

/** Permanently remove livestreams whose undo window has expired. */
export async function purgeExpiredMeetings() {
  const now = new Date();
  const expired = await prisma.meeting.findMany({
    where: {
      deletedAt: { not: null },
      purgeAt: { lte: now },
    },
    select: { id: true, recordingUrl: true },
  });

  for (const meeting of expired) {
    await permanentlyDeleteMeeting(meeting.id, meeting.recordingUrl);
  }

  return expired.length;
}
