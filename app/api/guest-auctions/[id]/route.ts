import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view this guest job." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { select: { companyId: true } } } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });

  const { id } = await params;
  const auction = await prisma.guestAuction.findUnique({ where: { id }, include: { _count: { select: { bids: true } }, review: true } });
  if (!auction) return NextResponse.json({ error: "Guest auction not found." }, { status: 404 });

  const isOwner = auction.createdByUserId === user.id;
  const membership = user.companies[0];
  if (!isOwner && !membership) return NextResponse.json({ error: "You do not have access to this guest job." }, { status: 403 });

  const ownBid = membership ? await prisma.guestAuctionBid.findUnique({ where: { guestAuctionId_bidderCompanyId: { guestAuctionId: auction.id, bidderCompanyId: membership.companyId } } }) : null;

  return NextResponse.json({
    viewerType: isOwner ? "GUEST_OWNER" : "COMPANY_BIDDER",
    auction: { id: auction.id, title: auction.title, itemDescription: auction.itemDescription, pickupLocation: auction.pickupLocation, deliveryLocation: auction.deliveryLocation, pickupDate: auction.pickupDate?.toISOString() ?? null, deliveryBy: auction.deliveryBy?.toISOString() ?? null, auctionClosesAt: auction.auctionClosesAt.toISOString(), notes: auction.notes, status: auction.status, bidCount: isOwner ? auction._count.bids : undefined, awardedBidId: isOwner ? auction.awardedBidId : undefined, awardedAt: auction.awardedAt?.toISOString() ?? null, createdAt: auction.createdAt.toISOString() },
    ownBid: ownBid ? { id: ownBid.id, amount: Number(ownBid.amount), serviceDescription: ownBid.serviceDescription, leadTime: ownBid.leadTime, notes: ownBid.notes, status: ownBid.status, createdAt: ownBid.createdAt.toISOString() } : null,
    review: isOwner && auction.review ? { rating: auction.review.rating, comment: auction.review.comment, createdAt: auction.review.createdAt.toISOString() } : null,
    privacy: isOwner ? "OWNER_CAN_COMPARE_ALL" : "SEALED",
  });
}
