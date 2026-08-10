export type HostGalleryLayout = "sidebar" | "bottom";
export type MemberVideoLayout = "pip" | "side-by-side";

const HOST_KEY = "repentance101-host-gallery-layout";
const MEMBER_KEY = "repentance101-member-video-layout";

export function getHostGalleryLayout(): HostGalleryLayout {
  return "sidebar";
}

export function setHostGalleryLayout(layout: HostGalleryLayout) {
  localStorage.setItem(HOST_KEY, layout);
}

export function getMemberVideoLayout(): MemberVideoLayout {
  if (typeof window === "undefined") return "pip";
  const stored = localStorage.getItem(MEMBER_KEY);
  return stored === "side-by-side" ? "side-by-side" : "pip";
}

export function setMemberVideoLayout(layout: MemberVideoLayout) {
  localStorage.setItem(MEMBER_KEY, layout);
}
