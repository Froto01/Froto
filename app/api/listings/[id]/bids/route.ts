import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BidResult =
  | {
      ok: true;
      bid: {
        id: string;
        amount: number;
        createdAt: string;
      };
      currentBid: number;
      minimumNextBid: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function isTransactionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2034"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to place a bid." },
      { status: 401 }
    );
  }

  const { id: listingId } = await params;

  let body: { amount?: unknown };

  try {
    body = (await request.json()) as { amount?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid bid request." }, { status: 400 });
  }

  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Enter a valid bid amount." },
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
      { error: "Complete your Froto user setup before bidding." },
      { status: 409 }
    );
  }

  const membership = user.companies[0];

  if (!membership) {
    return NextResponse.json(
      { error: "Create or join a company before bidding." },
      { status: 409 }
    );
  }

  let result: BidResult | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      result = await prisma.$transaction(
        async (tx): Promise<BidResult> => {
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

          if (listing.status !== "ACTIVE" || listing.awardedBidId) {
            return {
              ok: false,
              status: 409,
              error: "This listing is no longer accepting bids.",
            };
          }

          if (
            listing.biddingClosesAt &&
            listing.biddingClosesAt.getTime() <= Date.now()
          ) {
            return {
              ok: false,
              status: 409,
              error: "Bidding has closed for this listing.",
            };
          }

          if (listing.companyId === membership.companyId) {
            return {
              ok: false,
              status: 400,
              error: "You cannot bid on your own company listing.",
            };
          }

          const highestBid = await tx.bid.findFirst({
            where: {
              listingId,
            },
            orderBy: {
              amount: "desc",
            },
            select: {
              amount: true,
              bidderCompanyId: true,
            },
          });

          const currentBid = highestBid
            ? Number(highestBid.amount)
            : Number(listing.startingBid);
          const increment = Number(listing.minimumBidIncrement);
          const minimumNextBid = currentBid + increment;

          if (amount < minimumNextBid) {
            return {
              ok: false,
              status: 400,
              error: `Minimum next bid is ${minimumNextBid.toFixed(2)}.`,
            };
          }

          const bid = await tx.bid.create({
            data: {
              listingId,
              bidderCompanyId: membership.companyId,
              placedByUserId: user.id,
              amount,
            },
          });

          if (
            highestBid &&
            highestBid.bidderCompanyId !== membership.companyId
          ) {
            await tx.notification.create({
              data: {
                companyId: highestBid.bidderCompanyId,
                type: "OUTBID",
                title: "You have been outbid",
                message: `${listing.title} now has a higher bid.`,
                href: `/platform/listing/${listing.id}`,
                metadata: {
                  listingId: listing.id,
                  previousAmount: Number(highestBid.amount),
                  newAmount: Number(bid.amount),
                },
              },
            });
          }

          return {
            ok: true,
            bid: {
              id: bid.id,
              amount: Number(bid.amount),
              createdAt: bid.createdAt.toISOString(),
            },
            currentBid: Number(bid.amount),
            minimumNextBid: Number(bid.amount) + increment,
          };
        },
        {
          isolationLevel: "Serializable",
        }
      );
      break;
    } catch (error) {
      if (isTransactionConflict(error) && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  if (!result) {
    return NextResponse.json(
      { error: "The bid could not be placed. Please try again." },
      { status: 409 }
    );
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result, { status: 201 });
}
