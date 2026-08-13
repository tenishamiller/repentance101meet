-- Weekly "In case you missed it" planner: one topic + links per weekday.

CREATE TABLE "MissedItDay" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekday" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissedItDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MissedItLink" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MissedItLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissedItDay_weekStart_weekday_key" ON "MissedItDay"("weekStart", "weekday");
CREATE INDEX "MissedItDay_weekStart_idx" ON "MissedItDay"("weekStart");
CREATE INDEX "MissedItLink_dayId_sortOrder_idx" ON "MissedItLink"("dayId", "sortOrder");

ALTER TABLE "MissedItLink" ADD CONSTRAINT "MissedItLink_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "MissedItDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
