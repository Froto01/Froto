import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view this spot requirement." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });
  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "Spot requirements are available to Froto companies." }, { status: 403 });

  const { id } = await params;
  const requirement = await prisma.spotRequirement.findUnique({
    where: { id },
    include: { _count: { select: { offers: true } }, job: { select: { id: true, status: true } } },
  });
  if (!requirement) return NextResponse.json({ error: "Spot requirement not found." }, { status: 404 });

  const isOwner = requirement.companyId === membership.companyId;
  const ownOffer = isOwner ? null : await prisma.spotOffer.findUnique({ where: { spotRequirementId_companyId: { spotRequirementId: requirement.id, companyId: membership.companyId } } });

  return NextResponse.json({
    viewerType: isOwner ? "OWNER" : "PROVIDER",
    privacy: isOwner ? "OWNER_CAN_COMPARE_ALL" : "SEALED",
    requirement: {
      id: requirement.id,
      requirementType: requirement.requirementType,
      title: requirement.title,
      origin: requirement.origin,
      destination: requirement.destination,
      location: requirement.location,
      quantity: requirement.quantity,
      quantityUnit: requirement.quantityUnit,
      temperatureClass: requirement.temperatureClass,
      requiredFrom: requirement.requiredFrom.toISOString(),
      requiredTo: requirement.requiredTo?.toISOString() ?? null,
      offersCloseAt: requirement.offersCloseAt?.toISOString() ?? null,
      notes: requirement.notes,
      status: requirement.status,
      offerCount: isOwner ? requirement._count.offers : undefined,
      awardedOfferId: isOwner ? requirement.awardedOfferId : undefined,
      awardedAt: requirement.awardedAt?.toISOString() ?? null,
      job: requirement.job,
      createdAt: requirement.createdAt.toISOString(),
      updatedAt: requirement.updatedAt.toISOString(),
    },
    ownOffer: ownOffer ? { id: ownOffer.id, amount: Number(ownOffer.amount), serviceDescription: ownOffer.serviceDescription, leadTime: ownOffer.leadTime, notes: ownOffer.notes, status: ownOffer.status, createdAt: ownOffer.createdAt.toISOString(), updatedAt: ownOffer.updatedAt.toISOString(), awarded: requirement.awardedOfferId === ownOffer.id } : null,
  });
}
