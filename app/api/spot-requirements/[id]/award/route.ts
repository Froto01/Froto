import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createJobFeeSnapshotIfApplicable } from "@/lib/fee-snapshots";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const AWARD_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

type AwardResult =
  | { ok: true; awardedOfferId: string; awardedAt: string; winnerCompanyName: string; amount: number; jobId: string; closedEarly: boolean }
  | { ok: false; status: number; error: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to award this spot requirement." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup before awarding." }, { status: 409 });
  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "Create or join a company before awarding." }, { status: 409 });
  if (!AWARD_ROLES.has(membership.role)) return NextResponse.json({ error: "Your company role cannot award spot requirements." }, { status: 403 });

  let body: { offerId?: unknown; closeEarly?: unknown };
  try { body = (await request.json()) as { offerId?: unknown; closeEarly?: unknown }; }
  catch { return NextResponse.json({ error: "Invalid award request." }, { status: 400 }); }
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  const closeEarly = body.closeEarly === true;
  if (!offerId) return NextResponse.json({ error: "Choose an offer to award." }, { status: 400 });

  const result = await prisma.$transaction(async (tx): Promise<AwardResult> => {
    const requirement = await tx.spotRequirement.findUnique({ where: { id }, select: { id: true, companyId: true, title: true, status: true, offersCloseAt: true, awardedOfferId: true } });
    if (!requirement) return { ok: false, status: 404, error: "Spot requirement not found." };
    if (requirement.companyId !== membership.companyId) return { ok: false, status: 403, error: "Only the company that posted this requirement can award it." };
    if (requirement.awardedOfferId || requirement.status === "AWARDED") return { ok: false, status: 409, error: "This spot requirement has already been awarded." };
    if (requirement.status !== "OPEN") return { ok: false, status: 409, error: "This spot requirement is not open for award." };

    const stillOpen = !requirement.offersCloseAt || requirement.offersCloseAt.getTime() > Date.now();
    if (stillOpen && !closeEarly) return { ok: false, status: 409, error: "Offers are still open. Confirm that you want to close offers early before awarding a provider." };

    const offer = await tx.spotOffer.findFirst({ where: { id: offerId, spotRequirementId: requirement.id }, include: { company: { select: { id: true, name: true, verified: true } } } });
    if (!offer) return { ok: false, status: 400, error: "That offer does not belong to this spot requirement." };
    if (offer.status !== "SUBMITTED") return { ok: false, status: 409, error: "That offer is no longer available to award." };
    if (offer.companyId === requirement.companyId) return { ok: false, status: 409, error: "A company cannot be both buyer and provider on the same spot requirement." };

    const offeredCompanies = await tx.spotOffer.findMany({ where: { spotRequirementId: requirement.id }, select: { companyId: true }, distinct: ["companyId"] });
    const awardedAt = new Date();

    await tx.spotRequirement.update({ where: { id: requirement.id }, data: { awardedOfferId: offer.id, awardedAt, offersCloseAt: stillOpen ? awardedAt : requirement.offersCloseAt, status: "AWARDED" } });
    await tx.spotOffer.updateMany({ where: { spotRequirementId: requirement.id }, data: { status: "NOT_SELECTED" } });
    await tx.spotOffer.update({ where: { id: offer.id }, data: { status: "AWARDED" } });

    const job = await tx.job.create({ data: {
      spotRequirementId: requirement.id,
      awardedSpotOfferId: offer.id,
      buyerCompanyId: requirement.companyId,
      providerCompanyId: offer.companyId,
      amount: offer.amount,
      status: "AWARDED",
      events: { create: { eventType: "AWARDED", actorUserId: user.id, actorCompanyId: membership.companyId, note: `Awarded to ${offer.company.name}`, metadata: { spotRequirementId: requirement.id, awardedSpotOfferId: offer.id, amount: Number(offer.amount), winnerCompanyName: offer.company.name } } },
    } });

    await createJobFeeSnapshotIfApplicable({ tx, transactionType: "MARKETPLACE_JOB", sourceId: job.id, transactionAmount: offer.amount, buyerCompanyId: requirement.companyId, providerCompanyId: offer.companyId, calculatedAt: awardedAt, metadata: { spotRequirementId: requirement.id, awardedSpotOfferId: offer.id } });

    await tx.notification.create({ data: { companyId: offer.companyId, type: "SPOT_REQUIREMENT_AWARD_WON", title: "You won a spot logistics job", message: `Your company was selected for ${requirement.title} for ${Number(offer.amount).toLocaleString("en-AU", { style: "currency", currency: "AUD" })}. Accept the job to continue.`, href: `/platform/jobs/${job.id}`, metadata: { spotRequirementId: requirement.id, offerId: offer.id, jobId: job.id } } });

    for (const companyId of offeredCompanies.map((item) => item.companyId).filter((companyId) => companyId !== offer.companyId)) {
      await tx.notification.create({ data: { companyId, type: "SPOT_REQUIREMENT_AWARD_UNSUCCESSFUL", title: "Spot requirement result", message: `Another provider was selected for ${requirement.title}.`, href: `/platform/spot-requirements/${requirement.id}`, metadata: { spotRequirementId: requirement.id } } });
    }

    return { ok: true, awardedOfferId: offer.id, awardedAt: awardedAt.toISOString(), winnerCompanyName: offer.company.name, amount: Number(offer.amount), jobId: job.id, closedEarly: stillOpen };
  }, { isolationLevel: "Serializable" });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { status: 200 });
}
