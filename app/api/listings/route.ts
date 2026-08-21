import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  const viewer = userId
    ? await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { companies: { take: 1, select: { companyId: true } } },
      })
    : null;
  const viewerCompanyId = viewer?.companies[0]?.companyId ?? null;

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      company: {
        select: {
          name: true,
          verified: true,
        },
      },
      bids: {
        orderBy: {
          amount: "desc",
        },
        take: 1,
        select: {
          amount: true,
        },
      },
      _count: {
        select: {
          bids: true,
        },
      },
    },
  });

  return NextResponse.json(
    listings.map((listing) => {
      const currentBid =
        listing.bids.length > 0
          ? Number(listing.bids[0].amount)
          : Number(listing.startingBid);
      const biddingClosed = Boolean(
        listing.biddingClosesAt && listing.biddingClosesAt.getTime() <= Date.now()
      );

      return {
        id: listing.id,
        listingType: listing.listingType,
        title: listing.title,
        location: listing.location,
        origin: listing.origin,
        destination: listing.destination,
        capacityAmount: listing.capacityAmount,
        capacityUnit: listing.capacityUnit,
        temperatureClass: listing.temperatureClass,
        availableFrom: listing.availableFrom.toISOString(),
        availableTo: listing.availableTo.toISOString(),
        startingBid: Number(listing.startingBid),
        minimumBidIncrement: Number(listing.minimumBidIncrement),
        biddingClosesAt: listing.biddingClosesAt?.toISOString() ?? null,
        auctionState: biddingClosed ? "CLOSED" : "OPEN",
        currentBid,
        bidCount: listing._count.bids,
        notes: listing.notes,
        status: listing.status,
        companyName: listing.company.name,
        companyVerified: listing.company.verified,
        isOwner: viewerCompanyId === listing.companyId,
        createdAt: listing.createdAt.toISOString(),
      };
    })
  );
}
