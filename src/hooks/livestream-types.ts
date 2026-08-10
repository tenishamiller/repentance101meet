export type GalleryMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  connected: boolean;
  handRaised?: boolean;
  reaction?: string | null;
};
