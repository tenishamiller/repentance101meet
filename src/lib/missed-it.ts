export const WEEKDAYS = [
  { weekday: 1, name: "Monday" },
  { weekday: 2, name: "Tuesday" },
  { weekday: 3, name: "Wednesday" },
  { weekday: 4, name: "Thursday" },
  { weekday: 5, name: "Friday" },
] as const;

export const MAX_LINKS_PER_DAY = 5;

/** Monday of the ISO week containing `date`, as YYYY-MM-DD. */
export function weekStartIso(date = new Date()): string {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  return toIsoDate(local);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

export function shiftWeek(iso: string, weeks: number): string {
  const date = parseIsoDate(iso) ?? new Date();
  date.setDate(date.getDate() + weeks * 7);
  return weekStartIso(date);
}

export function weekLabel(iso: string): string {
  const start = parseIsoDate(iso);
  if (!start) return iso;
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const startText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startText} – ${endText}`;
}

export function dateForWeekday(weekStartIsoValue: string, weekday: number): string {
  const start = parseIsoDate(weekStartIsoValue);
  if (!start) return "";
  const date = new Date(start);
  date.setDate(date.getDate() + (weekday - 1));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
