import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  const [listings, tenders, guestJobs] = await Promise.all([
    prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ biddingClosesAt: null }, { biddingClosesAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        listingType: true,
        title: true,
        location: true,
        origin: true,
        destination: true,
        capacityAmount: true,
        capacityUnit: true,
        temperatureClass: true,
        biddingClosesAt: true,
        createdAt: true,
        _count: { select: { bids: true } },
      },
    }),
    prisma.tender.findMany({
      where: { status: "OPEN", responseClosesAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        origin: true,
        destination: true,
        volume: true,
        temperatureRequirement: true,
        responseClosesAt: true,
        createdAt: true,
        _count: { select: { responses: true } },
      },
    }),
    prisma.guestAuction.findMany({
      where: { status: "OPEN", auctionClosesAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        pickupLocation: true,
        deliveryLocation: true,
        auctionClosesAt: true,
        createdAt: true,
        _count: { select: { bids: true } },
      },
    }),
  ]);

  const items = [
    ...listings.map((listing) => ({
      id: `listing:${listing.id}`,
      href: `/platform/listing/${listing.id}`,
      type: listing.listingType === "Warehouse Space" ? "Warehouse" : "Transport",
      title:
        listing.listingType === "Warehouse Space"
          ? listing.location ?? listing.title
          : `${listing.origin ?? "Origin"} → ${listing.destination ?? "Destination"}`,
      detail: `${listing.capacityAmount} ${listing.capacityUnit}${listing.temperatureClass ? ` · ${listing.temperatureClass}` : ""}`,
      closesAt: listing.biddingClosesAt?.toISOString() ?? null,
      activityCount: listing._count.bids,
      activityLabel: listing._count.bids === 1 ? "1 bid" : `${listing._count.bids} bids`,
      createdAt: listing.createdAt.toISOString(),
    })),
    ...tenders.map((tender) => ({
      id: `tender:${tender.id}`,
      href: `/platform/tenders/${tender.id}`,
      type: "Tender",
      title: `${tender.origin} → ${tender.destination}`,
      detail: `${tender.volume}${tender.temperatureRequirement ? ` · ${tender.temperatureRequirement}` : ""}`,
      closesAt: tender.responseClosesAt.toISOString(),
      activityCount: tender._count.responses,
      activityLabel: tender._count.responses === 1 ? "1 sealed response" : `${tender._count.responses} sealed responses`,
      createdAt: tender.createdAt.toISOString(),
    })),
    ...guestJobs.map((job) => ({
      id: `guest:${job.id}`,
      href: `/platform/guest-auctions/${job.id}`,
      type: "Customer job",
      title: `${job.pickupLocation} → ${job.deliveryLocation}`,
      detail: job.title,
      closesAt: job.auctionClosesAt.toISOString(),
      activityCount: job._count.bids,
      activityLabel: job._count.bids === 1 ? "1 sealed offer" : `${job._count.bids} sealed offers`,
      createdAt: job.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return NextResponse.json({
    openCount: listings.length + tenders.length + guestJobs.length,
    items,
  });
}
