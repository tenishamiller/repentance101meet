/** Shared styles for braider schedule card actions. */

export const bookingActionsPanel =
  "overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm ring-1 ring-stone-100/80";

export const bookingActionsSection = "border-t border-stone-100 px-3 py-3 first:border-t-0";

export const bookingActionsSectionHeader = "mb-2.5";

export const bookingActionsSectionTitle =
  "text-[11px] font-extrabold uppercase tracking-wider text-stone-500";

export const bookingActionsSectionDesc =
  "mt-0.5 text-[11px] font-medium leading-snug text-stone-400";

export const bookingActionsPrimaryStack = "flex flex-col gap-2";

export const bookingActionsStatusStack = "flex flex-col gap-2";

export const bookingActionGrid = "grid grid-cols-2 gap-2";

export const bookingPolicyActionStack = "flex flex-col gap-2";

export const bookingPolicyGroupLabel = "mb-1 text-xs font-bold text-stone-800";

export const bookingPolicyGroupDesc = "mb-2 text-[11px] leading-snug text-stone-500";

export const bookingActionBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50";

/** @deprecated use bookingActionBtn — kept for gradual migration */
export const bookingActionBar =
  "rounded-xl border border-stone-200/80 bg-stone-50/60 p-2";

export const bookingActionBtnPrimary =
  `${bookingActionBtn} border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-500`;

export const bookingActionBtnPrimaryOutline =
  `${bookingActionBtn} border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`;

export const bookingActionBtnPrimaryViolet =
  `${bookingActionBtn} border-violet-700 bg-violet-700 text-white shadow-sm hover:bg-violet-600`;

export const bookingActionBtnNeutral =
  `${bookingActionBtn} border-stone-200 bg-white text-stone-800 hover:bg-stone-50`;

export const bookingActionBtnViolet =
  `${bookingActionBtn} border-violet-200 bg-white text-violet-800 hover:bg-violet-50`;

export const bookingActionBtnDanger =
  `${bookingActionBtn} border-red-200 bg-white text-red-700 hover:bg-red-50`;

export const bookingActionBtnOrange =
  `${bookingActionBtn} border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100`;

export const bookingActionBtnAmber =
  `${bookingActionBtn} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100`;

export const bookingActionBtnSubtle =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-700";

export const bookingActionBtnDashed =
  `${bookingActionBtn} border-dashed border-stone-300 bg-stone-50/80 text-stone-600 hover:bg-stone-100`;

/** Compact schedule action panel — tight grid layout. */
export const bookingActionPanelCompact =
  "mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white p-2 shadow-sm";

export const bookingActionCompactGrid = "grid grid-cols-2 gap-1.5";

export const bookingActionCompactBtn =
  "inline-flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold leading-snug transition disabled:opacity-50 sm:text-xs";

export const bookingActionCompactPrimary =
  `${bookingActionCompactBtn} col-span-2 border-emerald-600 bg-emerald-600 py-2 text-xs text-white hover:bg-emerald-500 sm:text-sm`;

export const bookingActionCompactDivider = "my-1.5 border-t border-stone-100";

export const bookingActionCompactLabel =
  "mb-1 px-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-400";

/** Schedule card action dock — primary stack + icon toolbar. */
export const bookingScheduleActionDock =
  "mt-4 overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm";

export const bookingScheduleActionPrimary =
  "space-y-2 border-b border-stone-100 bg-stone-50/40 p-3";

export const bookingScheduleActionToolbar =
  "grid grid-cols-2 gap-2 p-3 sm:grid-cols-4";

export const bookingScheduleToolbarBtn =
  "inline-flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2 py-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md active:translate-y-0 disabled:opacity-50";

export const bookingScheduleToolbarBtnLabel =
  "text-[11px] font-bold leading-tight text-stone-700 sm:text-xs";

export const bookingScheduleToolbarBtnIcon =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600";

export const bookingSchedulePolicyZone =
  "border-t border-stone-100 bg-stone-50/50 px-3 py-3";

export const bookingSchedulePolicyLabel =
  "mb-2 text-[11px] font-extrabold uppercase tracking-wider text-stone-500";

/** Braider booking actions v2 — clean row buttons. */
export const braiderActionsShell =
  "mt-4 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm";

export const braiderActionsPrimaryZone = "p-3";

export const braiderActionsStatusLine =
  "border-t border-stone-100 px-3 py-2 text-xs font-medium text-stone-600";

export const braiderActionsSecondaryRow = "grid grid-cols-2 gap-2 border-t border-stone-100 p-3";

export const braiderActionSimpleRow =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50";

export const braiderActionSimpleRowDanger =
  `${braiderActionSimpleRow} border-red-100 text-red-700 hover:border-red-200 hover:bg-red-50/60`;

export const braiderActionsMoreToggle =
  "flex w-full items-center justify-between border-t border-stone-100 px-3 py-2.5 text-left text-sm font-semibold text-stone-600 transition hover:bg-stone-50";

export const braiderActionsMoreBody = "space-y-1 border-t border-stone-100 bg-stone-50/40 px-2 py-2";

export const braiderActionMoreItem =
  "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:bg-white hover:text-stone-900";

/** Visit actions v3 — step flow, no nested card, link bar + problem list. */
export const visitActionsRoot = "mt-3 space-y-4";

export const visitActionsPhaseLabel =
  "text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700";

export const visitActionsSummary = "text-xs leading-relaxed text-stone-600";

export const visitActionsPrimaryBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-white shadow-md transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50";

export const visitActionsPrimaryBtnComplete =
  `${visitActionsPrimaryBtn} bg-gradient-to-r from-violet-600 to-violet-700 shadow-violet-200/50`;

export const visitActionsPrimaryBtnDeposit =
  `${visitActionsPrimaryBtn} bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-200/50 text-amber-950`;

export const visitActionsPrimaryBtnVideo =
  `${visitActionsPrimaryBtn} bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-200/50`;

export const visitActionsLinkBar =
  "flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm";

export const visitActionsLinkDivider = "select-none text-stone-300";

export const visitActionsLink =
  "rounded-lg px-2 py-1 font-semibold text-violet-700 transition hover:bg-violet-50 hover:text-violet-900";

export const visitActionsLinkDanger =
  "rounded-lg px-2 py-1 font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700";

export const visitActionsProblemZone =
  "border-t border-dashed border-stone-200 pt-4";

export const visitActionsProblemLabel =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400";

/** Single bordered list — every problem action is one equal row. */
export const visitActionsProblemList =
  "overflow-hidden rounded-xl border border-stone-200 bg-stone-50/80 divide-y divide-stone-200/90";

export const visitActionsProblemRow =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-stone-700 transition hover:bg-white active:bg-white";

export const visitActionsProblemRowIcon =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-stone-500 shadow-sm ring-1 ring-stone-200/80";

export const visitActionsProblemRowMuted =
  `${visitActionsProblemRow} text-stone-500 hover:text-stone-700`;

export const visitActionsProblemRowStack = "flex min-w-0 flex-1 flex-col gap-0.5 text-left";

export const visitActionsProblemRowTitle = "text-sm font-medium text-stone-800";

export const visitActionsProblemRowDesc = "text-xs leading-snug text-stone-500";

export const visitActionsInlinePanel =
  "rounded-xl border border-stone-200 bg-white p-3 shadow-sm";

/** Braider schedule — mobile-only action layout (full-width stack). */
export const bookingActionMobilePanel =
  "mt-3 space-y-2 rounded-xl border border-stone-200/90 bg-stone-50/50 p-2";

export const bookingActionMobilePrimary =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50";

export const bookingActionMobileBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50";

export const bookingActionMobileStack = "flex flex-col gap-1.5";

export const bookingActionMobilePolicy =
  "overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/60";

export const bookingActionMobilePolicySummary =
  "flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-bold text-amber-950 [&::-webkit-details-marker]:hidden";

export const bookingActionMobilePolicyBody = "space-y-1.5 border-t border-amber-200/60 px-2 pb-2 pt-2";

/** @deprecated — use bookingActionPanelCompact */
export const bookingActionHub =
  bookingActionPanelCompact;

/** @deprecated */
export const bookingActionHubHeader = "hidden";

/** @deprecated */
export const bookingActionHubTitle = bookingActionCompactLabel;

/** @deprecated */
export const bookingActionHubBody = "space-y-2";

/** @deprecated */
export const bookingActionScrollRow = bookingActionCompactGrid;

/** @deprecated */
export const bookingActionScrollPill = bookingActionCompactBtn;

/** @deprecated */
export const bookingActionHeroBtn = bookingActionCompactPrimary;

/** @deprecated */
export const bookingActionPolicyZone = "space-y-1.5";

/** @deprecated */
export const bookingActionPolicyZoneTitle = bookingActionCompactLabel;
