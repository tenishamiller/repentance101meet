import { PrivateSessionClient } from "./PrivateSessionClient";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PrivateSessionPage({ params }: Props) {
  const { token } = await params;
  return <PrivateSessionClient token={token} />;
}
