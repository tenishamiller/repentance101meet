import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getInitials } from "@/lib/utils";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true, role: true, createdAt: true },
  });

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full bg-burgundy/10 ring-4 ring-gold/40">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            width={128}
            height={128}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-burgundy">
            {getInitials(user.name)}
          </span>
        )}
      </div>
      <h1 className="font-serif text-3xl font-bold text-burgundy">{user.name}</h1>
      <BrandDivider className="mx-auto my-4 max-w-[120px]" />
      {user.role === "ADMIN" && (
        <p className="text-sm font-medium text-gold-muted">
          Teacher — {MINISTRY_NAME}
        </p>
      )}
      <p className="mt-4 text-sm text-burgundy/60">
        Member since{" "}
        {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(user.createdAt)}
      </p>
    </div>
  );
}
