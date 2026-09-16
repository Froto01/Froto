import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in with a company account to submit an offer." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });
  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "Only Froto companies can submit spot offers." }, { status: 403 });

  const requirement = await prisma.spotRequirement.findUnique({ where: { id }, select: { id: true, companyId: true, status: true, offersCloseAt: true, awardedOfferId: true } });
  if (!requirement) return NextResponse.json({ error: "Spot requirement not found." }, { status: 404 });
  if (requirement.companyId === membership.companyId) return NextResponse.json({ error: "Your company cannot submit an offer to its own requirement." }, { status: 403 });
  if (requirement.status !== "OPEN" || requirement.awardedOfferId) return NextResponse.json({ error: "This spot requirement is no longer accepting offers." }, { status: 409 });
  if (requirement.offersCloseAt && requirement.offersCloseAt.getTime() <= Date.now()) return NextResponse.json({ error: "The offer period has closed." }, { status: 409 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid offer payload." }, { status: 400 }); }

  const amount = Number(body.amount);
  const serviceDescription = typeof body.serviceDescription === "string" ? body.serviceDescription.trim().slice(0, 1500) : "";
  const leadTime = typeof body.leadTime === "string" ? body.leadTime.trim().slice(0, 250) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Provide an offer amount greater than zero." }, { status: 400 });

  try {
    const offer = await prisma.spotOffer.create({ data: { spotRequirementId: requirement.id, companyId: membership.companyId, submittedByUserId: user.id, amount, serviceDescription: serviceDescription || null, leadTime: leadTime || null, notes: notes || null } });
    return NextResponse.json({ id: offer.id, amount: Number(offer.amount), status: offer.status, createdAt: offer.createdAt.toISOString(), privacy: "SEALED" }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Your company has already submitted an offer to this requirement." }, { status: 409 });
    throw error;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view spot offers." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });
  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "Spot offers are available to Froto companies." }, { status: 403 });

  const requirement = await prisma.spotRequirement.findUnique({ where: { id }, select: { id: true, companyId: true, awardedOfferId: true } });
  if (!requirement) return NextResponse.json({ error: "Spot requirement not found." }, { status: 404 });

  if (requirement.companyId === membership.companyId) {
    const offers = await prisma.spotOffer.findMany({ where: { spotRequirementId: id }, orderBy: { amount: "asc" }, include: { company: { select: { id: true, name: true, verified: true, companyType: true, locations: true } } } });
    const comparison = await Promise.all(offers.map(async (offer) => {
      const [companyReviews, guestReviews, completedJobs, completedGuestJobs] = await Promise.all([
        prisma.review.findMany({ where: { reviewedCompanyId: offer.companyId }, select: { rating: true } }),
        prisma.guestAuctionReview.findMany({ where: { reviewedCompanyId: offer.companyId }, select: { rating: true } }),
        prisma.job.count({ where: { status: "COMPLETED", OR: [{ buyerCompanyId: offer.companyId }, { providerCompanyId: offer.companyId }] } }),
        prisma.guestAuction.count({ where: { status: "COMPLETED", awardedBid: { bidderCompanyId: offer.companyId } } }),
      ]);
      const ratings = [...companyReviews, ...guestReviews].map((review) => review.rating);
      const ratingAverage = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
      return { id: offer.id, amount: Number(offer.amount), serviceDescription: offer.serviceDescription, leadTime: offer.leadTime, notes: offer.notes, status: offer.status, createdAt: offer.createdAt.toISOString(), company: { ...offer.company, ratingAverage, reviewCount: ratings.length, completedJobs: completedJobs + completedGuestJobs }, awarded: requirement.awardedOfferId === offer.id };
    }));
    return NextResponse.json({ viewerType: "OWNER", privacy: "OWNER_CAN_COMPARE_ALL", offers: comparison });
  }

  const ownOffer = await prisma.spotOffer.findUnique({ where: { spotRequirementId_companyId: { spotRequirementId: id, companyId: membership.companyId } } });
  return NextResponse.json({ viewerType: "PROVIDER", privacy: "SEALED", ownOffer: ownOffer ? { id: ownOffer.id, amount: Number(ownOffer.amount), serviceDescription: ownOffer.serviceDescription, leadTime: ownOffer.leadTime, notes: ownOffer.notes, status: ownOffer.status, createdAt: ownOffer.createdAt.toISOString(), updatedAt: ownOffer.updatedAt.toISOString(), awarded: requirement.awardedOfferId === ownOffer.id } : null });
}
