import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getOfferContext(id: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return { error: NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 }) };
  const membership = user.companies[0];
  if (!membership) return { error: NextResponse.json({ error: "Only Froto companies can submit spot offers." }, { status: 403 }) };

  const requirement = await prisma.spotRequirement.findUnique({ where: { id }, select: { id: true, companyId: true, status: true, offersCloseAt: true, awardedOfferId: true } });
  if (!requirement) return { error: NextResponse.json({ error: "Spot requirement not found." }, { status: 404 }) };
  if (requirement.companyId === membership.companyId) return { error: NextResponse.json({ error: "Your company cannot submit an offer to its own requirement." }, { status: 403 }) };
  return { user, membership, requirement };
}

function parseOfferBody(body: Record<string, unknown>) {
  const amount = Number(body.amount);
  const serviceDescription = typeof body.serviceDescription === "string" ? body.serviceDescription.trim().slice(0, 1500) : "";
  const leadTime = typeof body.leadTime === "string" ? body.leadTime.trim().slice(0, 250) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  return { amount, serviceDescription, leadTime, notes };
}

function offerWindowError(requirement: { status: string; awardedOfferId: string | null; offersCloseAt: Date | null }) {
  if (requirement.status !== "OPEN" || requirement.awardedOfferId) return NextResponse.json({ error: "This spot requirement is no longer accepting offers." }, { status: 409 });
  if (requirement.offersCloseAt && requirement.offersCloseAt.getTime() <= Date.now()) return NextResponse.json({ error: "The offer period has closed." }, { status: 409 });
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in with a company account to submit an offer." }, { status: 401 });

  const context = await getOfferContext(id, userId);
  if ("error" in context) return context.error;
  const { user, membership, requirement } = context;
  const windowError = offerWindowError(requirement);
  if (windowError) return windowError;

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid offer payload." }, { status: 400 }); }

  const { amount, serviceDescription, leadTime, notes } = parseOfferBody(body);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Provide an offer amount greater than zero." }, { status: 400 });
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(amount))) return NextResponse.json({ error: "Offer amounts can have no more than two decimal places." }, { status: 400 });

  try {
    const offer = await prisma.$transaction(async (tx) => {
      const created = await tx.spotOffer.create({ data: { spotRequirementId: requirement.id, companyId: membership.companyId, submittedByUserId: user.id, amount, serviceDescription: serviceDescription || null, leadTime: leadTime || null, notes: notes || null } });
      await tx.notification.create({ data: { companyId: requirement.companyId, type: "SPOT_OFFER_RECEIVED", title: "New private spot offer", message: `A provider submitted a private offer for your spot requirement.`, href: `/platform/spot-requirements/${requirement.id}`, metadata: { spotRequirementId: requirement.id, offerId: created.id } } });
      return created;
    });
    return NextResponse.json({ id: offer.id, amount: Number(offer.amount), status: offer.status, createdAt: offer.createdAt.toISOString(), privacy: "SEALED" }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Your company has already submitted an offer to this requirement." }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in with a company account to revise an offer." }, { status: 401 });

  const context = await getOfferContext(id, userId);
  if ("error" in context) return context.error;
  const { user, membership, requirement } = context;
  const windowError = offerWindowError(requirement);
  if (windowError) return windowError;

  const existing = await prisma.spotOffer.findUnique({ where: { spotRequirementId_companyId: { spotRequirementId: requirement.id, companyId: membership.companyId } } });
  if (!existing) return NextResponse.json({ error: "Your company has not submitted an offer to this requirement." }, { status: 404 });
  if (existing.status !== "SUBMITTED") return NextResponse.json({ error: "This offer can no longer be revised." }, { status: 409 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid offer payload." }, { status: 400 }); }

  const { amount, serviceDescription, leadTime, notes } = parseOfferBody(body);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Provide an offer amount greater than zero." }, { status: 400 });
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(amount))) return NextResponse.json({ error: "Offer amounts can have no more than two decimal places." }, { status: 400 });

  // Award also uses Serializable and writes this requirement and its offers.
  // Re-read both rows inside the same isolation boundary: a preflight check
  // alone lets a revision overwrite an award's settled offer amount.
  const offer = await prisma.$transaction(async (tx) => {
    const currentRequirement = await tx.spotRequirement.findUnique({
      where: { id: requirement.id },
      select: { status: true, awardedOfferId: true, offersCloseAt: true },
    });
    if (!currentRequirement || currentRequirement.status !== "OPEN" || currentRequirement.awardedOfferId ||
      (currentRequirement.offersCloseAt && currentRequirement.offersCloseAt.getTime() <= Date.now())) return null;

    const currentOffer = await tx.spotOffer.findUnique({
      where: { spotRequirementId_companyId: { spotRequirementId: requirement.id, companyId: membership.companyId } },
    });
    if (!currentOffer || currentOffer.id !== existing.id || currentOffer.status !== "SUBMITTED") return null;

    const changed = await tx.spotOffer.updateMany({
      where: { id: currentOffer.id, spotRequirementId: requirement.id, companyId: membership.companyId, status: "SUBMITTED" },
      data: { amount, serviceDescription: serviceDescription || null, leadTime: leadTime || null, notes: notes || null, submittedByUserId: user.id },
    });
    if (changed.count !== 1) return null;
    return tx.spotOffer.findUnique({ where: { id: currentOffer.id } });
  }, { isolationLevel: "Serializable" }).catch((error: unknown) => {
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") return null;
    throw error;
  });

  if (!offer) return NextResponse.json({ error: "This offer or requirement changed while you were revising it. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ id: offer.id, amount: Number(offer.amount), serviceDescription: offer.serviceDescription, leadTime: offer.leadTime, notes: offer.notes, status: offer.status, updatedAt: offer.updatedAt.toISOString(), privacy: "SEALED" });
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
