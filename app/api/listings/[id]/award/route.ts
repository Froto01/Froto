import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const AWARD_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

type AwardResult =
  | {
      ok: true;
      awardedBidId: string;
      awardedAt: string;
      winnerCompanyName: string;
      amount: number;
      jobId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to award a listing." },
      { status: 401 }
    );
  }

  const { id: listingId } = await params;

  let body: { bidId?: unknown };

  try {
    body = (await request.json()) as { bidId?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid award request." },
      { status: 400 }
    );
  }

  const bidId = typeof body.bidId === "string" ? body.bidId : "";

  if (!bidId) {
    return NextResponse.json(
      { error: "Select a bid to award." },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "Complete your Froto user setup before awarding." },
      { status: 409 }
    );
  }

  const membership = user.companies[0];

  if (!membership) {
    return NextResponse.json(
      { error: "Create or join a company before awarding." },
      { status: 409 }
    );
  }

  if (!AWARD_ROLES.has(membership.role)) {
    return NextResponse.json(
      { error: "Your company role cannot award listings." },
      { status: 403 }
    );
  }

  const result = await prisma.$transaction(
    async (tx): Promise<AwardResult> => {
      const listing = await tx.listing.findUnique({
        where: {
          id: listingId,
        },
      });

      if (!listing) {
        return {
          ok: false,
          status: 404,
          error: "Listing not found.",
        };
      }

      if (listing.companyId !== membership.companyId) {
        return {
          ok: false,
          status: 403,
          error: "Only the listing company can award this capacity.",
        };
      }

      if (listing.awardedBidId || listing.status === "AWARDED") {
        return {
          ok: false,
          status: 409,
          error: "This listing has already been awarded.",
        };
      }

      if (
        !listing.biddingClosesAt ||
        listing.biddingClosesAt.getTime() > Date.now()
      ) {
        return {
          ok: false,
          status: 409,
          error: "Bidding must be closed before a winner can be awarded.",
        };
      }

      const bid = await tx.bid.findUnique({
        where: {
          id: bidId,
        },
        include: {
          bidderCompany: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!bid || bid.listingId !== listing.id) {
        return {
          ok: false,
          status: 400,
          error: "That bid does not belong to this listing.",
        };
      }

      const awardedAt = new Date();

      await tx.listing.update({
        where: {
          id: listing.id,
        },
        data: {
          awardedBidId: bid.id,
          awardedAt,
          status: "AWARDED",
        },
      });

      const job = await tx.job.create({
        data: {
          listingId: listing.id,
          awardedBidId: bid.id,
          buyerCompanyId: bid.bidderCompanyId,
          providerCompanyId: listing.companyId,
          amount: bid.amount,
          status: "AWARDED",
          events: {
            create: {
              eventType: "AWARDED",
              actorUserId: user.id,
              actorCompanyId: membership.companyId,
              note: `Awarded to ${bid.bidderCompany.name}`,
              metadata: {
                awardedBidId: bid.id,
                amount: Number(bid.amount),
                winnerCompanyName: bid.bidderCompany.name,
              },
            },
          },
        },
      });

      return {
        ok: true,
        awardedBidId: bid.id,
        awardedAt: awardedAt.toISOString(),
        winnerCompanyName: bid.bidderCompany.name,
        amount: Number(bid.amount),
        jobId: job.id,
      };
    },
    {
      isolationLevel: "Serializable",
    }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result, { status: 200 });
}
