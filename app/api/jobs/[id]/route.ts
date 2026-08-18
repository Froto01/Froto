import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to view this job." }, { status: 401 });
  }

  const { id: jobId } = await params;

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

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      listing: true,
      buyerCompany: { select: { id: true, name: true, verified: true } },
      providerCompany: { select: { id: true, name: true, verified: true } },
      events: {
        orderBy: { createdAt: "asc" },
        include: {
          actorCompany: { select: { name: true } },
          actorUser: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (
    membership.companyId !== job.buyerCompanyId &&
    membership.companyId !== job.providerCompanyId
  ) {
    return NextResponse.json(
      { error: "This job does not belong to your company." },
      { status: 403 }
    );
  }

  const viewerSide =
    membership.companyId === job.buyerCompanyId ? "BUYER" : "PROVIDER";

  return NextResponse.json({
    id: job.id,
    listingId: job.listingId,
    awardedBidId: job.awardedBidId,
    amount: Number(job.amount),
    status: job.status,
    acceptedAt: job.acceptedAt?.toISOString() ?? null,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    viewerSide,
    viewerRole: membership.role,
    buyerCompany: job.buyerCompany,
    providerCompany: job.providerCompany,
    listing: {
      id: job.listing.id,
      listingType: job.listing.listingType,
      title: job.listing.title,
      location: job.listing.location,
      origin: job.listing.origin,
      destination: job.listing.destination,
      capacityAmount: job.listing.capacityAmount,
      capacityUnit: job.listing.capacityUnit,
      temperatureClass: job.listing.temperatureClass,
      availableFrom: job.listing.availableFrom.toISOString(),
      availableTo: job.listing.availableTo.toISOString(),
      notes: job.listing.notes,
    },
    events: job.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      note: event.note,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      actorCompanyName: event.actorCompany?.name ?? null,
      actorUserName:
        [event.actorUser?.firstName, event.actorUser?.lastName]
          .filter(Boolean)
          .join(" ") || event.actorUser?.email || null,
    })),
  });
}
