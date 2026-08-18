import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { UserAvatar } from "@/components/UserAvatar";
import { formatMemberSince } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true, role: true, createdAt: true },
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="flex justify-center">
        <UserAvatar
          userId={user.id}
          name={user.name}
          avatarUrl={user.avatarUrl}
          size="2xl"
          interactive={false}
          className="ring-4"
        />
      </div>
      <h1 className="mt-6 font-serif text-3xl font-bold text-burgundy">{user.name}</h1>
      <BrandDivider className="mx-auto my-4 max-w-[120px]" />
      {user.role === "ADMIN" && (
        <p className="text-sm font-medium text-gold-muted">Teacher — {MINISTRY_NAME}</p>
      )}
      <p className="mt-4 text-sm text-burgundy/60">
        Member since {formatMemberSince(user.createdAt)}
      </p>
      {isOwnProfile && (
        <Link href="/settings" className="btn-outline-gold mt-8 inline-block">
          Account settings
        </Link>
      )}
    </div>
  );
}
