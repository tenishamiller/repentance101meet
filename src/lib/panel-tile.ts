/** Zoom-style short widescreen frame for In room sidebar tiles. */
export const PANEL_TILE_FRAME_CLASS =
  "relative aspect-video w-full shrink-0 overflow-hidden bg-black";

/** Wrapper for a stacked sidebar tile (video frame + name row). */
export const PANEL_TILE_CARD_CLASS =
  "flex w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-gold/30 bg-burgundy-dark sm:rounded-xl";

/**
 * In room grid: 1–4 people stay one column; 5–6 use two; 7+ use three
 * (max 3×3 on screen, then scroll). Never more than 3 columns.
 */
export function inRoomGridColumns(count: number): 1 | 2 | 3 {
  if (count <= 4) return 1;
  if (count <= 6) return 2;
  return 3;
}
