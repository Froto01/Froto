import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to view jobs." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Complete your Froto user setup before viewing jobs." },
      { status: 409 }
    );
  }

  const membership = user.companies[0];

  if (!membership) {
    return NextResponse.json(
      { error: "Create or join a company before viewing jobs." },
      { status: 409 }
    );
  }

  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { buyerCompanyId: membership.companyId },
        { providerCompanyId: membership.companyId },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: true,
      buyerCompany: { select: { id: true, name: true, verified: true } },
      providerCompany: { select: { id: true, name: true, verified: true } },
      _count: { select: { events: true } },
    },
  });

  return NextResponse.json(
    jobs.map((job) => ({
      id: job.id,
      listingId: job.listingId,
      title: job.listing.title,
      listingType: job.listing.listingType,
      location:
        job.listing.listingType === "Transport Lane"
          ? `${job.listing.origin ?? "Origin"} to ${job.listing.destination ?? "Destination"}`
          : job.listing.location ?? "Location not supplied",
      capacityAmount: job.listing.capacityAmount,
      capacityUnit: job.listing.capacityUnit,
      amount: Number(job.amount),
      status: job.status,
      viewerSide:
        membership.companyId === job.buyerCompanyId ? "BUYER" : "PROVIDER",
      buyerCompany: job.buyerCompany,
      providerCompany: job.providerCompany,
      acceptedAt: job.acceptedAt?.toISOString() ?? null,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      eventCount: job._count.events,
    }))
  );
}
