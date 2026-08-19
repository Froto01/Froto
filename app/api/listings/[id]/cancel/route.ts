import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to cancel a listing." }, { status: 401 });
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
    return NextResponse.json({ error: "Your company role cannot cancel listings." }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        status: true,
        awardedBidId: true,
        title: true,
      },
    });

    if (!listing) {
      return { ok: false as const, status: 404, error: "Listing not found." };
    }

    if (listing.companyId !== membership.companyId) {
      return {
        ok: false as const,
        status: 403,
        error: "Only the listing company can cancel this listing.",
      };
    }

    if (listing.awardedBidId || listing.status === "AWARDED") {
      return {
        ok: false as const,
        status: 409,
        error: "An awarded listing cannot be cancelled. Manage the resulting job instead.",
      };
    }

    if (listing.status === "CANCELLED") {
      return {
        ok: false as const,
        status: 409,
        error: "This listing is already cancelled.",
      };
    }

    if (listing.status !== "ACTIVE") {
      return {
        ok: false as const,
        status: 409,
        error: "This listing can no longer be cancelled.",
      };
    }

    await tx.listing.update({
      where: { id: listing.id },
      data: { status: "CANCELLED" },
    });

    return { ok: true as const, listingId: listing.id, title: listing.title };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result, { status: 200 });
}
