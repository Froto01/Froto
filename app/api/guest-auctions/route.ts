import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { notifyMatchingOpportunity } from "@/lib/opportunity-alerts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) return NextResponse.json({ error: "Sign in as a guest to post a job." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { select: { companyId: true } } },
  });

  if (!user) return NextResponse.json({ error: "Complete your Froto user setup first." }, { status: 409 });

  if (user.companies.length > 0) {
    return NextResponse.json(
      { error: "Guest job posting is for individual users without a company membership." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid guest job payload." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
  const itemDescription = typeof body.itemDescription === "string" ? body.itemDescription.trim().slice(0, 2000) : "";
  const pickupLocation = typeof body.pickupLocation === "string" ? body.pickupLocation.trim().slice(0, 250) : "";
  const deliveryLocation = typeof body.deliveryLocation === "string" ? body.deliveryLocation.trim().slice(0, 250) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
  const pickupDate = parseOptionalDate(body.pickupDate);
  const deliveryBy = parseOptionalDate(body.deliveryBy);
  const auctionClosesAt = parseOptionalDate(body.auctionClosesAt);

  if (!title || !itemDescription || !pickupLocation || !deliveryLocation || !auctionClosesAt) {
    return NextResponse.json(
      { error: "Title, item details, pickup, delivery and auction closing time are required." },
      { status: 400 }
    );
  }

  if (auctionClosesAt.getTime() <= Date.now()) return NextResponse.json({ error: "Auction closing time must be in the future." }, { status: 400 });
  if (pickupDate && deliveryBy && deliveryBy.getTime() < pickupDate.getTime()) return NextResponse.json({ error: "Delivery date cannot be before pickup date." }, { status: 400 });

  const auction = await prisma.guestAuction.create({
    data: {
      createdByUserId: user.id,
      title,
      itemDescription,
      pickupLocation,
      deliveryLocation,
      pickupDate,
      deliveryBy,
      auctionClosesAt,
      notes: notes || null,
    },
  });

  try {
    await notifyMatchingOpportunity({
      type: "GUEST_JOB",
      title: auction.title,
      locations: [auction.pickupLocation, auction.deliveryLocation],
      href: `/platform/guest-auctions/${auction.id}`,
      sourceUserId: user.id,
      metadata: { guestAuctionId: auction.id },
    });
  } catch (error) {
    console.error("Opportunity alert matching failed for guest job", auction.id, error);
  }

  return NextResponse.json(
    {
      id: auction.id,
      title: auction.title,
      status: auction.status,
      auctionClosesAt: auction.auctionClosesAt.toISOString(),
      createdAt: auction.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) return NextResponse.json({ error: "Sign in to view guest auctions." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { select: { companyId: true } } },
  });

  if (!user) return NextResponse.json({ error: "Complete your Froto user setup first." }, { status: 409 });

  const membership = user.companies[0];

  if (!membership) {
    const auctions = await prisma.guestAuction.findMany({
      where: { createdByUserId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bids: true } } },
    });

    return NextResponse.json({
      viewerType: "GUEST_OWNER",
      auctions: auctions.map((auction) => ({
        id: auction.id,
        title: auction.title,
        pickupLocation: auction.pickupLocation,
        deliveryLocation: auction.deliveryLocation,
        status: auction.status,
        auctionClosesAt: auction.auctionClosesAt.toISOString(),
        awardedAt: auction.awardedAt?.toISOString() ?? null,
        bidCount: auction._count.bids,
        createdAt: auction.createdAt.toISOString(),
      })),
    });
  }

  const includeHistory = new URL(request.url).searchParams.get("includeHistory") === "1";
  const openAuctionWhere: Prisma.GuestAuctionWhereInput = {
    status: "OPEN",
    auctionClosesAt: { gt: new Date() },
  };
  const awardedHistoryWhere: Prisma.GuestAuctionWhereInput = {
    status: { in: ["AWARDED", "ACCEPTED", "IN_PROGRESS", "DELIVERED", "COMPLETED"] },
    bids: { some: { bidderCompanyId: membership.companyId, status: "AWARDED" } },
  };

  const auctions = await prisma.guestAuction.findMany({
    where: includeHistory ? { OR: [openAuctionWhere, awardedHistoryWhere] } : openAuctionWhere,
    orderBy: { updatedAt: "desc" },
    include: {
      bids: {
        where: { bidderCompanyId: membership.companyId },
        select: {
          id: true,
          amount: true,
          serviceDescription: true,
          leadTime: true,
          notes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    viewerType: "COMPANY_BIDDER",
    auctions: auctions.map((auction) => ({
      id: auction.id,
      title: auction.title,
      itemDescription: auction.itemDescription,
      pickupLocation: auction.pickupLocation,
      deliveryLocation: auction.deliveryLocation,
      pickupDate: auction.pickupDate?.toISOString() ?? null,
      deliveryBy: auction.deliveryBy?.toISOString() ?? null,
      auctionClosesAt: auction.auctionClosesAt.toISOString(),
      notes: auction.notes,
      status: auction.status,
      awardedAt: auction.awardedAt?.toISOString() ?? null,
      ownBid: auction.bids[0]
        ? {
            ...auction.bids[0],
            amount: Number(auction.bids[0].amount),
            createdAt: auction.bids[0].createdAt.toISOString(),
            updatedAt: auction.bids[0].updatedAt.toISOString(),
          }
        : null,
    })),
  });
}
