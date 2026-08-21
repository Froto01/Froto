import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to manage a listing." }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });
  const membership = user?.companies[0];

  if (!membership) {
    return NextResponse.json({ error: "Complete your Froto company setup first." }, { status: 409 });
  }

  if (!MANAGE_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Your company role cannot manage listings." }, { status: 403 });
  }

  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: "Choose a valid listing action." }, { status: 400 });
  }

  const action = body.action === "PAUSE" || body.action === "REOPEN" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "Choose pause or reopen." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id } });

    if (!listing) return { ok: false as const, status: 404, error: "Listing not found." };
    if (listing.companyId !== membership.companyId) {
      return { ok: false as const, status: 403, error: "Only the listing company can manage this listing." };
    }
    if (listing.awardedBidId || listing.status === "AWARDED") {
      return { ok: false as const, status: 409, error: "An awarded listing cannot be paused or reopened." };
    }

    if (action === "PAUSE") {
      if (listing.status !== "ACTIVE") {
        return { ok: false as const, status: 409, error: "Only an active listing can be paused." };
      }
      await tx.listing.update({ where: { id }, data: { status: "PAUSED" } });
      return { ok: true as const, statusValue: "PAUSED" };
    }

    if (listing.status !== "PAUSED") {
      return { ok: false as const, status: 409, error: "Only a paused listing can be reopened." };
    }
    if (!listing.biddingClosesAt || listing.biddingClosesAt.getTime() <= Date.now()) {
      return { ok: false as const, status: 409, error: "Extend the bidding close time before reopening this listing." };
    }
    if (listing.availableTo.getTime() < Date.now()) {
      return { ok: false as const, status: 409, error: "Extend the availability dates before reopening this listing." };
    }

    await tx.listing.update({ where: { id }, data: { status: "ACTIVE" } });
    return { ok: true as const, statusValue: "ACTIVE" };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, status: result.statusValue });
}
