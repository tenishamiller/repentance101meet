import { MeetingPageClient } from "@/app/meeting/[token]/MeetingPageClient";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function MobileMeetingPage({ params }: Props) {
  const { token } = await params;
  return <MeetingPageClient token={token} />;
}
