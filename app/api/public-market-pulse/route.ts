import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MIN_SAMPLE = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type BenchmarkType = "Transport lane" | "3PL warehouse";

type Observation = {
  key: string;
  label: string;
  type: BenchmarkType;
  unit: "shipment" | "pallet / week";
  amount: number;
  completedAt: Date;
};

function normalise(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export async function GET() {
  const now = new Date();
  const currentStart = new Date(now.getTime() - 30 * DAY_MS);
  const previousStart = new Date(now.getTime() - 60 * DAY_MS);

  const jobs = await prisma.job.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: previousStart },
      listingId: { not: null },
    },
    select: {
      amount: true,
      completedAt: true,
      listing: {
        select: {
          listingType: true,
          origin: true,
          destination: true,
          location: true,
          capacityUnit: true,
          temperatureClass: true,
        },
      },
    },
  });

  const observations: Observation[] = [];

  for (const job of jobs) {
    if (!job.completedAt || !job.listing) continue;
    const amount = Number(job.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    if (
      job.listing.listingType === "Transport Lane" &&
      job.listing.origin &&
      job.listing.destination
    ) {
      const origin = job.listing.origin.trim();
      const destination = job.listing.destination.trim();
      observations.push({
        key: `transport:${normalise(origin)}:${normalise(destination)}`,
        label: `${origin} → ${destination}`,
        type: "Transport lane",
        unit: "shipment",
        amount,
        completedAt: job.completedAt,
      });
      continue;
    }

    if (
      job.listing.listingType === "Warehouse Space" &&
      job.listing.location &&
      job.listing.capacityUnit === "pallets"
    ) {
      const location = job.listing.location.trim();
      const temperature = job.listing.temperatureClass?.trim() || "ambient";
      observations.push({
        key: `warehouse:${normalise(location)}:${normalise(temperature)}`,
        label: `${location} · ${temperature}`,
        type: "3PL warehouse",
        unit: "pallet / week",
        amount,
        completedAt: job.completedAt,
      });
    }
  }

  const grouped = new Map<string, Observation[]>();
  for (const observation of observations) {
    const group = grouped.get(observation.key) ?? [];
    group.push(observation);
    grouped.set(observation.key, group);
  }

  const benchmarks = [...grouped.values()]
    .map((group) => {
      const current = group.filter((item) => item.completedAt >= currentStart);
      const previous = group.filter(
        (item) => item.completedAt >= previousStart && item.completedAt < currentStart
      );
      if (current.length === 0) return null;

      const currentMedian = median(current.map((item) => item.amount));
      const previousMedian = median(previous.map((item) => item.amount));
      const ready = current.length >= MIN_SAMPLE && currentMedian !== null;
      const comparablePrevious = previous.length >= MIN_SAMPLE && previousMedian !== null;
      const trendPercent =
        ready && comparablePrevious && previousMedian > 0
          ? ((currentMedian - previousMedian) / previousMedian) * 100
          : null;

      return {
        label: group[0].label,
        type: group[0].type,
        unit: group[0].unit,
        sampleCount: current.length,
        minimumSample: MIN_SAMPLE,
        status: ready ? "READY" : "BUILDING",
        medianRate: ready ? Math.round(currentMedian * 100) / 100 : null,
        trendPercent:
          trendPercent === null ? null : Math.round(trendPercent * 10) / 10,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "READY" ? -1 : 1;
      return b.sampleCount - a.sampleCount;
    })
    .slice(0, 4);

  return NextResponse.json(
    {
      periodDays: 30,
      methodology: "Median completed awarded transactions",
      minimumSample: MIN_SAMPLE,
      benchmarks,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
