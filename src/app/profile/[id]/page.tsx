import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getInitials } from "@/lib/utils";

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
      <div className="mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full bg-amber-100 ring-4 ring-amber-200">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            width={128}
            height={128}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-amber-900">
            {getInitials(user.name)}
          </span>
        )}
      </div>
      <h1 className="font-serif text-3xl font-bold">{user.name}</h1>
      {user.role === "ADMIN" && (
        <p className="mt-2 text-sm font-medium text-amber-700">Teacher — Repentance 101</p>
      )}
      <p className="mt-4 text-sm text-stone-500">
        Member since{" "}
        {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(user.createdAt)}
      </p>
    </div>
  );
}
