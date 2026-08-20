import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

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
  const canEdit = isOwner && listing.status === "ACTIVE" && listing.bids.length === 0;
  const canCancel = isOwner && listing.status === "ACTIVE" && !listing.awardedBidId;

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
    canEdit,
    canCancel,
    viewerCompanyId,
    createdAt: listing.createdAt.toISOString(),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to edit a listing." }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  if (!user || !user.companies[0]) {
    return NextResponse.json({ error: "Complete your Froto company setup first." }, { status: 409 });
  }

  const membership = user.companies[0];

  if (!MANAGE_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Your company role cannot edit listings." }, { status: 403 });
  }

  const existing = await prisma.listing.findUnique({
    where: { id },
    include: { _count: { select: { bids: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (existing.companyId !== membership.companyId) {
    return NextResponse.json({ error: "Only the listing company can edit this listing." }, { status: 403 });
  }

  if (existing.status !== "ACTIVE" || existing.awardedBidId) {
    return NextResponse.json({ error: "This listing can no longer be edited." }, { status: 409 });
  }

  if (existing._count.bids > 0) {
    return NextResponse.json(
      { error: "Listings are locked for editing after the first bid. You can cancel it instead." },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid listing update." }, { status: 400 });
  }

  const listingType = body.listingType === "Warehouse Space" ? "Warehouse Space" : "Transport Lane";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const origin = typeof body.origin === "string" ? body.origin.trim() : "";
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  const capacityAmount = Number(body.capacityAmount);
  const capacityUnit = typeof body.capacityUnit === "string" ? body.capacityUnit : "";
  const temperatureClass = typeof body.temperatureClass === "string" ? body.temperatureClass : "";
  const availableFrom = parseDateOnly(body.availableFrom);
  const availableTo = parseDateOnly(body.availableTo);
  const startingBid = Number(body.startingBid);
  const minimumBidIncrement = Number(body.minimumBidIncrement);
  const biddingClosesAt = typeof body.biddingClosesAt === "string" ? new Date(body.biddingClosesAt) : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  const allowedUnits = new Set(["pallets", "parcels", "sqm", "cbm"]);
  const allowedTemperatures = new Set(["ambient", "chilled", "frozen", "dangerous goods", "other"]);

  if (!title) return NextResponse.json({ error: "A listing title is required." }, { status: 400 });
  if (!Number.isInteger(capacityAmount) || capacityAmount <= 0) {
    return NextResponse.json({ error: "Capacity must be greater than zero." }, { status: 400 });
  }
  if (!allowedUnits.has(capacityUnit)) {
    return NextResponse.json({ error: "Choose a valid capacity unit." }, { status: 400 });
  }
  if (!allowedTemperatures.has(temperatureClass)) {
    return NextResponse.json({ error: "Choose a valid temperature class." }, { status: 400 });
  }
  if (!availableFrom || !availableTo || availableTo < availableFrom) {
    return NextResponse.json({ error: "Please provide a valid availability date range." }, { status: 400 });
  }
  if (!Number.isFinite(startingBid) || startingBid < 0) {
    return NextResponse.json({ error: "Starting bid must be zero or greater." }, { status: 400 });
  }
  if (!Number.isFinite(minimumBidIncrement) || minimumBidIncrement <= 0) {
    return NextResponse.json({ error: "Minimum bid increment must be greater than zero." }, { status: 400 });
  }
  if (!biddingClosesAt || Number.isNaN(biddingClosesAt.getTime()) || biddingClosesAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Bidding close time must be in the future." }, { status: 400 });
  }
  if (listingType === "Transport Lane" && (!origin || !destination)) {
    return NextResponse.json({ error: "Transport listings need an origin and destination." }, { status: 400 });
  }
  if (listingType === "Warehouse Space" && !location) {
    return NextResponse.json({ error: "Warehouse listings need a location." }, { status: 400 });
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: {
      listingType,
      title,
      location: listingType === "Warehouse Space" ? location : null,
      origin: listingType === "Transport Lane" ? origin : null,
      destination: listingType === "Transport Lane" ? destination : null,
      capacityAmount,
      capacityUnit,
      temperatureClass,
      availableFrom,
      availableTo,
      startingBid,
      minimumBidIncrement,
      biddingClosesAt,
      notes: notes || null,
    },
  });

  return NextResponse.json({ success: true, listingId: updated.id });
}
