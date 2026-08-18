import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();

  const listing = await prisma.listing.findUnique({
    where: {
      id,
    },
    include: {
      company: {
        select: {
          name: true,
          verified: true,
        },
      },
      bids: {
        orderBy: [
          {
            amount: "desc",
          },
          {
            createdAt: "asc",
          },
        ],
        take: 100,
        include: {
          bidderCompany: {
            select: {
              name: true,
              verified: true,
            },
          },
        },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  let viewerCompanyId: string | null = null;

  if (userId) {
    const viewer = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
      select: {
        companies: {
          take: 1,
          select: {
            companyId: true,
          },
        },
      },
    });

    viewerCompanyId = viewer?.companies[0]?.companyId ?? null;
  }

  const currentBid =
    listing.bids.length > 0
      ? Number(listing.bids[0].amount)
      : Number(listing.startingBid);
  const minimumNextBid = currentBid + Number(listing.minimumBidIncrement);
  const biddingClosed = Boolean(
    listing.biddingClosesAt && listing.biddingClosesAt.getTime() <= Date.now()
  );
  const isAwarded = Boolean(listing.awardedBidId);
  const auctionState = isAwarded
    ? "AWARDED"
    : listing.status !== "ACTIVE"
      ? listing.status
      : biddingClosed
        ? "CLOSED"
        : "OPEN";
  const isOwner = viewerCompanyId === listing.companyId;
  const canAward = isOwner && auctionState === "CLOSED" && listing.bids.length > 0;

  return NextResponse.json({
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
    biddingClosed,
    auctionState,
    currentBid,
    minimumNextBid,
    bidCount: listing.bids.length,
    bids: listing.bids.map((bid) => ({
      id: bid.id,
      amount: Number(bid.amount),
      createdAt: bid.createdAt.toISOString(),
      bidderCompanyName: bid.bidderCompany.name,
      bidderCompanyVerified: bid.bidderCompany.verified,
      bidderCompanyId: bid.bidderCompanyId,
      outcome: listing.awardedBidId
        ? bid.id === listing.awardedBidId
          ? "WINNER"
          : "UNSUCCESSFUL"
        : "ACTIVE",
    })),
    awardedBidId: listing.awardedBidId,
    awardedAt: listing.awardedAt?.toISOString() ?? null,
    notes: listing.notes,
    status: listing.status,
    companyName: listing.company.name,
    companyVerified: listing.company.verified,
    isOwner,
    canAward,
    viewerCompanyId,
    createdAt: listing.createdAt.toISOString(),
  });
}
