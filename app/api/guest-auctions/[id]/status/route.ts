import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Action = "ACCEPT" | "START" | "DELIVER" | "COMPLETE";

const transitions: Record<Action, { from: string; to: string }> = {
  ACCEPT: { from: "AWARDED", to: "ACCEPTED" },
  START: { from: "ACCEPTED", to: "IN_PROGRESS" },
  DELIVER: { from: "IN_PROGRESS", to: "DELIVERED" },
  COMPLETE: { from: "DELIVERED", to: "COMPLETED" },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to update this guest job." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { select: { companyId: true } } },
  });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });

  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid status request." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.toUpperCase() as Action : null;
  if (!action || !transitions[action]) {
    return NextResponse.json({ error: "Choose a valid guest job action." }, { status: 400 });
  }

  const { id } = await params;
  const result = await prisma.$transaction(async (tx) => {
    const auction = await tx.guestAuction.findUnique({
      where: { id },
      include: {
        awardedBid: { select: { bidderCompanyId: true } },
      },
    });

    if (!auction) return { ok: false as const, status: 404, error: "Guest job not found." };
    if (!auction.awardedBid || !auction.awardedBidId) {
      return { ok: false as const, status: 409, error: "This guest job has not been awarded yet." };
    }

    const transition = transitions[action];
    if (auction.status !== transition.from) {
      return {
        ok: false as const,
        status: 409,
        error: `This action is not available while the guest job is ${auction.status.toLowerCase().replaceAll("_", " ")}.`,
      };
    }

    const isGuestOwner = auction.createdByUserId === user.id;
    const isWinningProvider = user.companies.some(
      (membership) => membership.companyId === auction.awardedBid?.bidderCompanyId
    );

    if (action === "COMPLETE") {
      if (!isGuestOwner) {
        return { ok: false as const, status: 403, error: "Only the guest customer can confirm completion." };
      }
    } else if (!isWinningProvider) {
      return { ok: false as const, status: 403, error: "Only the winning company can update this job." };
    }

    const updated = await tx.guestAuction.update({
      where: { id: auction.id },
      data: { status: transition.to },
      select: { id: true, status: true, updatedAt: true },
    });

    return {
      ok: true as const,
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
