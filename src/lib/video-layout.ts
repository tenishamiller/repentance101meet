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
  return "side-by-side";
}

export function setMemberVideoLayout(layout: MemberVideoLayout) {
  localStorage.setItem(MEMBER_KEY, layout);
}
