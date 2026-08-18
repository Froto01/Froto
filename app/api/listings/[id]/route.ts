import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

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
    notes: listing.notes,
    status: listing.status,
    companyName: listing.company.name,
    companyVerified: listing.company.verified,
    createdAt: listing.createdAt.toISOString(),
  });
}
