import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { BrandDivider } from "@/components/BrandDivider";
import { MissedItBoard } from "@/components/missed-it/MissedItBoard";
import { MINISTRY_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `In case you missed it · ${MINISTRY_NAME}`,
  description: `Topics taught this week at ${MINISTRY_NAME}, with links for each day.`,
};

export default async function MissedItPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  const { week } = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-muted">
        Weekly recap
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-burgundy sm:text-4xl">
        In case you missed it
      </h1>
      <BrandDivider className="my-4 max-w-xs" />
      <p className="max-w-2xl text-burgundy/70">
        What we talked about each weekday, with links to go deeper. Five days,
        like a planner — Monday through Friday.
      </p>
      {session?.user?.role === "ADMIN" && (
        <p className="mt-3 text-sm text-burgundy/60">
          You are posting as host. Use Post or Edit on a day to add the topic and
          up to five links.
        </p>
      )}
      <div className="mt-8">
        <MissedItBoard initialWeek={week} isAdmin={session?.user?.role === "ADMIN"} />
      </div>
    </div>
  );
}
