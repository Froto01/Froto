import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in with a company account to bid." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });
  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "Only Froto companies can bid on guest jobs." }, { status: 403 });

  const auction = await prisma.guestAuction.findUnique({ where: { id }, select: { id: true, createdByUserId: true, status: true, auctionClosesAt: true, awardedBidId: true } });
  if (!auction) return NextResponse.json({ error: "Guest auction not found." }, { status: 404 });
  if (auction.createdByUserId === user.id) return NextResponse.json({ error: "You cannot bid on your own guest job." }, { status: 403 });
  if (auction.status !== "OPEN" || auction.awardedBidId) return NextResponse.json({ error: "This guest auction is no longer accepting bids." }, { status: 409 });
  if (auction.auctionClosesAt.getTime() <= Date.now()) return NextResponse.json({ error: "The silent auction has closed." }, { status: 409 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid bid payload." }, { status: 400 }); }

  const amount = Number(body.amount);
  const serviceDescription = typeof body.serviceDescription === "string" ? body.serviceDescription.trim().slice(0, 1500) : "";
  const leadTime = typeof body.leadTime === "string" ? body.leadTime.trim().slice(0, 250) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Provide a bid amount greater than zero." }, { status: 400 });

  try {
    const bid = await prisma.guestAuctionBid.create({ data: { guestAuctionId: auction.id, bidderCompanyId: membership.companyId, placedByUserId: user.id, amount, serviceDescription: serviceDescription || null, leadTime: leadTime || null, notes: notes || null } });
    return NextResponse.json({ id: bid.id, amount: Number(bid.amount), status: bid.status, createdAt: bid.createdAt.toISOString(), privacy: "SEALED" }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Your company has already submitted a bid to this silent auction." }, { status: 409 });
    throw error;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view auction bids." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });

  const auction = await prisma.guestAuction.findUnique({ where: { id }, select: { id: true, createdByUserId: true, status: true, auctionClosesAt: true, awardedBidId: true } });
  if (!auction) return NextResponse.json({ error: "Guest auction not found." }, { status: 404 });

  if (auction.createdByUserId === user.id) {
    const bids = await prisma.guestAuctionBid.findMany({ where: { guestAuctionId: auction.id }, orderBy: { amount: "asc" }, include: { bidderCompany: { select: { id: true, name: true, verified: true, companyType: true, locations: true } } } });
    const comparison = await Promise.all(bids.map(async (bid) => {
      const [companyReviews, guestReviews, completedJobs, completedGuestJobs] = await Promise.all([
        prisma.review.findMany({ where: { reviewedCompanyId: bid.bidderCompanyId }, select: { rating: true } }),
        prisma.guestAuctionReview.findMany({ where: { reviewedCompanyId: bid.bidderCompanyId }, select: { rating: true } }),
        prisma.job.count({ where: { status: "COMPLETED", OR: [{ buyerCompanyId: bid.bidderCompanyId }, { providerCompanyId: bid.bidderCompanyId }] } }),
        prisma.guestAuction.count({ where: { status: "COMPLETED", awardedBid: { bidderCompanyId: bid.bidderCompanyId } } }),
      ]);
      const ratings = [...companyReviews, ...guestReviews].map((review) => review.rating);
      const ratingAverage = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
      return {
        id: bid.id,
        amount: Number(bid.amount),
        serviceDescription: bid.serviceDescription,
        leadTime: bid.leadTime,
        notes: bid.notes,
        status: bid.status,
        createdAt: bid.createdAt.toISOString(),
        company: { ...bid.bidderCompany, ratingAverage, reviewCount: ratings.length, completedJobs: completedJobs + completedGuestJobs },
        awarded: auction.awardedBidId === bid.id,
      };
    }));
    return NextResponse.json({ viewerType: "GUEST_OWNER", privacy: "OWNER_CAN_COMPARE_ALL", bids: comparison });
  }

  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "You do not have access to these bids." }, { status: 403 });

  const ownBid = await prisma.guestAuctionBid.findUnique({ where: { guestAuctionId_bidderCompanyId: { guestAuctionId: auction.id, bidderCompanyId: membership.companyId } } });
  return NextResponse.json({ viewerType: "COMPANY_BIDDER", privacy: "SEALED", ownBid: ownBid ? { id: ownBid.id, amount: Number(ownBid.amount), serviceDescription: ownBid.serviceDescription, leadTime: ownBid.leadTime, notes: ownBid.notes, status: ownBid.status, createdAt: ownBid.createdAt.toISOString(), updatedAt: ownBid.updatedAt.toISOString(), awarded: auction.awardedBidId === ownBid.id } : null });
}
