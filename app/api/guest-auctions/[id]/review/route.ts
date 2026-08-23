import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Froto user not found." }, { status: 404 });

  const { id } = await params;
  const auction = await prisma.guestAuction.findUnique({
    where: { id },
    include: { awardedBid: { select: { bidderCompanyId: true } }, review: { select: { id: true } } },
  });
  if (!auction) return NextResponse.json({ error: "Guest job not found." }, { status: 404 });
  if (auction.createdByUserId !== user.id) return NextResponse.json({ error: "Only the guest customer can review this job." }, { status: 403 });
  if (auction.status !== "COMPLETED" || !auction.awardedBid) return NextResponse.json({ error: "Reviews are available only after the guest job is completed." }, { status: 409 });
  if (auction.review) return NextResponse.json({ error: "This guest job has already been reviewed." }, { status: 409 });

  const body = (await request.json()) as { rating?: number; comment?: string };
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  const comment = body.comment?.trim() || null;

  const review = await prisma.guestAuctionReview.create({
    data: { guestAuctionId: auction.id, reviewedCompanyId: auction.awardedBid.bidderCompanyId, reviewerUserId: user.id, rating, comment },
  });
  return NextResponse.json({ review }, { status: 201 });
}
