import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to award this guest job." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  if (!user) {
    return NextResponse.json({ error: "Complete your Froto user setup first." }, { status: 409 });
  }

  let body: { bidId?: unknown; closeEarly?: unknown };

  try {
    body = (await request.json()) as { bidId?: unknown; closeEarly?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid award request." }, { status: 400 });
  }

  const bidId = typeof body.bidId === "string" ? body.bidId.trim() : "";
  const closeEarly = body.closeEarly === true;

  if (!bidId) {
    return NextResponse.json({ error: "Choose a company bid to award." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const auction = await tx.guestAuction.findUnique({
      where: { id },
      select: {
        id: true,
        createdByUserId: true,
        title: true,
        status: true,
        auctionClosesAt: true,
        awardedBidId: true,
      },
    });

    if (!auction) {
      return { ok: false as const, status: 404, error: "Guest auction not found." };
    }

    if (auction.createdByUserId !== user.id) {
      return { ok: false as const, status: 403, error: "Only the guest who posted this job can award it." };
    }

    if (auction.awardedBidId || auction.status === "AWARDED") {
      return { ok: false as const, status: 409, error: "This guest job has already been awarded." };
    }

    if (auction.status !== "OPEN") {
      return { ok: false as const, status: 409, error: "This guest auction is not open for award." };
    }

    const stillOpen = auction.auctionClosesAt.getTime() > Date.now();
    if (stillOpen && !closeEarly) {
      return {
        ok: false as const,
        status: 409,
        error: "Bidding is still open. Confirm that you want to close bidding early before awarding a winner.",
      };
    }

    const bid = await tx.guestAuctionBid.findFirst({
      where: { id: bidId, guestAuctionId: auction.id },
      include: { bidderCompany: { select: { id: true, name: true, verified: true } } },
    });

    if (!bid) {
      return { ok: false as const, status: 404, error: "That bid does not belong to this guest auction." };
    }

    const awardedAt = new Date();

    await tx.guestAuction.update({
      where: { id: auction.id },
      data: {
        awardedBidId: bid.id,
        awardedAt,
        auctionClosesAt: stillOpen ? awardedAt : auction.auctionClosesAt,
        status: "AWARDED",
      },
    });

    await tx.guestAuctionBid.updateMany({
      where: { guestAuctionId: auction.id },
      data: { status: "NOT_SELECTED" },
    });

    await tx.guestAuctionBid.update({
      where: { id: bid.id },
      data: { status: "AWARDED" },
    });

    await tx.notification.create({
      data: {
        companyId: bid.bidderCompany.id,
        type: "GUEST_AUCTION_AWARDED",
        title: "Guest transport job awarded",
        message: `Your company won \"${auction.title}\" for $${Number(bid.amount).toLocaleString("en-AU")}. Open the job to accept and manage the work.`,
        href: `/platform/guest-auctions/${auction.id}`,
        metadata: {
          guestAuctionId: auction.id,
          guestAuctionBidId: bid.id,
          amount: Number(bid.amount),
        },
      },
    });

    return {
      ok: true as const,
      auctionId: auction.id,
      title: auction.title,
      bidId: bid.id,
      amount: Number(bid.amount),
      providerCompany: bid.bidderCompany,
      awardedAt: awardedAt.toISOString(),
      closedEarly: stillOpen,
    };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
