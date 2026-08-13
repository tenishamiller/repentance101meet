import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  MAX_LINKS_PER_DAY,
  WEEKDAYS,
  parseIsoDate,
  weekStartIso,
} from "@/lib/missed-it";

function asUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

const putSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekday: z.number().int().min(1).max(5),
  topic: z.string().trim().max(2000),
  links: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        url: z.string().trim().url(),
      }),
    )
    .max(MAX_LINKS_PER_DAY),
});

export async function GET(request: NextRequest) {
  const weekParam = request.nextUrl.searchParams.get("week");
  const parsed = weekParam ? parseIsoDate(weekParam) : new Date();
  const weekStart = weekStartIso(parsed ?? new Date());
  const weekDate = asUtcDate(weekStart);

  const rows = await prisma.missedItDay.findMany({
    where: { weekStart: weekDate },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });

  const byWeekday = new Map(rows.map((row) => [row.weekday, row]));
  const days = WEEKDAYS.map(({ weekday, name }) => {
    const row = byWeekday.get(weekday);
    return {
      weekday,
      name,
      topic: row?.topic ?? "",
      links: (row?.links ?? []).map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
      })),
    };
  });

  return Response.json({ weekStart, days });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid day" },
        { status: 400 },
      );
    }
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!parseIsoDate(body.weekStart) || weekStartIso(parseIsoDate(body.weekStart)!) !== body.weekStart) {
    return Response.json({ error: "weekStart must be a Monday." }, { status: 400 });
  }

  const weekDate = asUtcDate(body.weekStart);
  const topic = body.topic.trim();
  const links = body.links.filter((link) => link.title && link.url);

  const existing = await prisma.missedItDay.findUnique({
    where: {
      weekStart_weekday: { weekStart: weekDate, weekday: body.weekday },
    },
  });

  if (!topic && links.length === 0) {
    if (existing) {
      await prisma.missedItDay.delete({ where: { id: existing.id } });
    }
    return Response.json({ ok: true, cleared: true });
  }

  if (!topic) {
    return Response.json({ error: "Add what was talked about that day." }, { status: 400 });
  }

  const day = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.missedItDay.update({
          where: { id: existing.id },
          data: { topic },
        })
      : await tx.missedItDay.create({
          data: { weekStart: weekDate, weekday: body.weekday, topic },
        });

    await tx.missedItLink.deleteMany({ where: { dayId: saved.id } });
    if (links.length > 0) {
      await tx.missedItLink.createMany({
        data: links.map((link, index) => ({
          dayId: saved.id,
          title: link.title,
          url: link.url,
          sortOrder: index,
        })),
      });
    }

    return tx.missedItDay.findUnique({
      where: { id: saved.id },
      include: { links: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return Response.json({ ok: true, day });
}
