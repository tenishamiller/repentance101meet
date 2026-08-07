import { MeetingPageClient } from "./MeetingPageClient";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function MeetingPage({ params }: Props) {
  const { token } = await params;
  return <MeetingPageClient token={token} />;
}
