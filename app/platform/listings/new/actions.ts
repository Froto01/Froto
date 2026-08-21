"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

type CreateListingInput = {
  listingType: "Transport Lane" | "Warehouse Space";
  title: string;
  location: string;
  origin: string;
  destination: string;
  capacityAmount: string;
  capacityUnit: "pallets" | "parcels" | "sqm" | "cbm";
  temperatureClass:
    | "ambient"
    | "chilled"
    | "frozen"
    | "dangerous goods"
    | "other";
  availableFrom: string;
  availableTo: string;
  startingBid: string;
  minimumBidIncrement: string;
  biddingClosesAt: string;
  notes: string;
};

export async function createListing(input: CreateListingInput) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth-test");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      companies: true,
    },
  });

  if (!user) {
    redirect("/user-sync");
  }

  const membership = user.companies[0];

  if (!membership) {
    redirect("/company/new");
  }

  if (!MANAGE_ROLES.has(membership.role)) {
    throw new Error("Your company role cannot publish marketplace listings.");
  }

  const capacityAmount = Number.parseInt(input.capacityAmount, 10);
  const startingBid = Number(input.startingBid);
  const minimumBidIncrement = Number(input.minimumBidIncrement);
  const availableFrom = new Date(`${input.availableFrom}T00:00:00.000Z`);
  const availableTo = new Date(`${input.availableTo}T00:00:00.000Z`);
  const biddingClosesAt = new Date(input.biddingClosesAt);

  if (!input.title.trim()) {
    throw new Error("A listing title is required.");
  }

  if (!Number.isInteger(capacityAmount) || capacityAmount <= 0) {
    throw new Error("Capacity must be greater than zero.");
  }

  if (!Number.isFinite(startingBid) || startingBid < 0) {
    throw new Error("Starting bid must be zero or greater.");
  }

  if (!Number.isFinite(minimumBidIncrement) || minimumBidIncrement <= 0) {
    throw new Error("Minimum bid increment must be greater than zero.");
  }

  if (
    Number.isNaN(availableFrom.getTime()) ||
    Number.isNaN(availableTo.getTime()) ||
    availableTo < availableFrom
  ) {
    throw new Error("Please provide a valid availability date range.");
  }

  if (
    Number.isNaN(biddingClosesAt.getTime()) ||
    biddingClosesAt.getTime() <= Date.now()
  ) {
    throw new Error("Bidding close time must be in the future.");
  }

  if (
    input.listingType === "Transport Lane" &&
    (!input.origin.trim() || !input.destination.trim())
  ) {
    throw new Error("Transport listings need an origin and destination.");
  }

  if (input.listingType === "Warehouse Space" && !input.location.trim()) {
    throw new Error("Warehouse listings need a location.");
  }

  const listing = await prisma.listing.create({
    data: {
      companyId: membership.companyId,
      listingType: input.listingType,
      title: input.title.trim(),
      location:
        input.listingType === "Warehouse Space" ? input.location.trim() : null,
      origin:
        input.listingType === "Transport Lane" ? input.origin.trim() : null,
      destination:
        input.listingType === "Transport Lane"
          ? input.destination.trim()
          : null,
      capacityAmount,
      capacityUnit: input.capacityUnit,
      temperatureClass: input.temperatureClass,
      availableFrom,
      availableTo,
      startingBid: input.startingBid,
      minimumBidIncrement: input.minimumBidIncrement,
      biddingClosesAt,
      notes: input.notes.trim() || null,
    },
  });

  return {
    success: true,
    listingId: listing.id,
  };
}
