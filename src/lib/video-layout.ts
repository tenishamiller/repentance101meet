export type HostGalleryLayout = "sidebar" | "bottom";
export type MemberVideoLayout = "pip" | "side-by-side";

const HOST_KEY = "repentance101-host-gallery-layout";
const MEMBER_KEY = "repentance101-member-video-layout";

export function getHostGalleryLayout(): HostGalleryLayout {
  if (typeof window === "undefined") return "sidebar";
  const stored = localStorage.getItem(HOST_KEY);
  return stored === "bottom" ? "bottom" : "sidebar";
}

export function setHostGalleryLayout(layout: HostGalleryLayout) {
  localStorage.setItem(HOST_KEY, layout);
}

export function getMemberVideoLayout(): MemberVideoLayout {
  if (typeof window === "undefined") return "side-by-side";
  const stored = localStorage.getItem(MEMBER_KEY);
  return stored === "pip" ? "pip" : "side-by-side";
}

export function setMemberVideoLayout(layout: MemberVideoLayout) {
  localStorage.setItem(MEMBER_KEY, layout);
}
