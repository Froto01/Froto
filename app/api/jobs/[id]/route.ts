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
      tender: true,
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

  const source = job.listing
    ? {
        type: "MARKETPLACE" as const,
        id: job.listing.id,
        title: job.listing.title,
        location:
          job.listing.listingType === "Transport Lane"
            ? `${job.listing.origin ?? "Origin"} to ${job.listing.destination ?? "Destination"}`
            : job.listing.location ?? "Warehouse space",
        capacity: `${job.listing.capacityAmount} ${job.listing.capacityUnit}`,
        detail: job.listing.temperatureClass,
        notes: job.listing.notes,
        href: `/platform/listing/${job.listing.id}`,
      }
    : job.tender
      ? {
          type: "TENDER" as const,
          id: job.tender.id,
          title: job.tender.title,
          location: `${job.tender.origin} to ${job.tender.destination}`,
          capacity: job.tender.volume,
          detail: job.tender.productDescription,
          notes: job.tender.notes,
          href: `/platform/tenders/${job.tender.id}`,
        }
      : null;

  if (!source) {
    return NextResponse.json({ error: "This job has no transaction source." }, { status: 409 });
  }

  return NextResponse.json({
    id: job.id,
    listingId: job.listingId,
    awardedBidId: job.awardedBidId,
    tenderId: job.tenderId,
    awardedTenderResponseId: job.awardedTenderResponseId,
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
    source,
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
