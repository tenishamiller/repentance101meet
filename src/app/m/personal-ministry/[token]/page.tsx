import { PrivateSessionClient } from "@/app/personal-ministry/[token]/PrivateSessionClient";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function MobilePrivateSessionPage({ params }: Props) {
  const { token } = await params;
  return <PrivateSessionClient token={token} />;
}
