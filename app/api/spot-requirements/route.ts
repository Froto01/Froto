import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in with a company account to post a spot requirement." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });
  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "Only Froto companies can post spot requirements." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid spot requirement payload." }, { status: 400 }); }

  const requirementType = typeof body.requirementType === "string" ? body.requirementType.trim().toUpperCase() : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
  const origin = typeof body.origin === "string" ? body.origin.trim().slice(0, 250) : "";
  const destination = typeof body.destination === "string" ? body.destination.trim().slice(0, 250) : "";
  const location = typeof body.location === "string" ? body.location.trim().slice(0, 250) : "";
  const quantity = Number(body.quantity);
  const quantityUnit = typeof body.quantityUnit === "string" ? body.quantityUnit.trim().slice(0, 80) : "";
  const temperatureClass = typeof body.temperatureClass === "string" ? body.temperatureClass.trim().slice(0, 100) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
  const requiredFrom = parseOptionalDate(body.requiredFrom);
  const requiredTo = parseOptionalDate(body.requiredTo);
  const offersCloseAt = parseOptionalDate(body.offersCloseAt);

  if (!['TRANSPORT', 'STORAGE'].includes(requirementType)) return NextResponse.json({ error: "Requirement type must be TRANSPORT or STORAGE." }, { status: 400 });
  if (!title || !Number.isInteger(quantity) || quantity <= 0 || !quantityUnit || !requiredFrom) return NextResponse.json({ error: "Title, quantity, quantity unit and required-from date are required." }, { status: 400 });
  if (requirementType === 'TRANSPORT' && (!origin || !destination)) return NextResponse.json({ error: "Transport requirements need an origin and destination." }, { status: 400 });
  if (requirementType === 'STORAGE' && !location) return NextResponse.json({ error: "Storage requirements need a location." }, { status: 400 });
  if (requiredTo && requiredTo.getTime() < requiredFrom.getTime()) return NextResponse.json({ error: "Required-to date cannot be before required-from date." }, { status: 400 });
  if (offersCloseAt && offersCloseAt.getTime() <= Date.now()) return NextResponse.json({ error: "Offer closing time must be in the future." }, { status: 400 });

  const requirement = await prisma.spotRequirement.create({
    data: {
      companyId: membership.companyId,
      createdByUserId: user.id,
      requirementType,
      title,
      origin: origin || null,
      destination: destination || null,
      location: location || null,
      quantity,
      quantityUnit,
      temperatureClass: temperatureClass || null,
      requiredFrom,
      requiredTo,
      offersCloseAt,
      notes: notes || null,
    },
  });

  return NextResponse.json({
    id: requirement.id,
    requirementType: requirement.requirementType,
    title: requirement.title,
    status: requirement.status,
    offersCloseAt: requirement.offersCloseAt?.toISOString() ?? null,
    createdAt: requirement.createdAt.toISOString(),
  }, { status: 201 });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view spot requirements." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: true } });
  if (!user) return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 409 });
  const membership = user.companies[0];
  if (!membership) return NextResponse.json({ error: "Spot requirements are available to Froto companies." }, { status: 403 });

  const own = new URL(request.url).searchParams.get("own") === "1";
  const now = new Date();
  const requirements = await prisma.spotRequirement.findMany({
    where: own ? { companyId: membership.companyId } : { companyId: { not: membership.companyId }, status: "OPEN", OR: [{ offersCloseAt: null }, { offersCloseAt: { gt: now } }] },
    orderBy: { createdAt: "desc" },
    include: { offers: { where: { companyId: membership.companyId }, select: { id: true, amount: true, status: true, createdAt: true, updatedAt: true } }, _count: { select: { offers: true } } },
  });

  return NextResponse.json({
    viewerType: own ? "OWNER" : "PROVIDER",
    privacy: "SEALED_OFFERS",
    requirements: requirements.map((item) => ({
      id: item.id,
      requirementType: item.requirementType,
      title: item.title,
      origin: item.origin,
      destination: item.destination,
      location: item.location,
      quantity: item.quantity,
      quantityUnit: item.quantityUnit,
      temperatureClass: item.temperatureClass,
      requiredFrom: item.requiredFrom.toISOString(),
      requiredTo: item.requiredTo?.toISOString() ?? null,
      offersCloseAt: item.offersCloseAt?.toISOString() ?? null,
      notes: item.notes,
      status: item.status,
      awardedAt: item.awardedAt?.toISOString() ?? null,
      offerCount: own ? item._count.offers : undefined,
      ownOffer: item.offers[0] ? { ...item.offers[0], amount: Number(item.offers[0].amount), createdAt: item.offers[0].createdAt.toISOString(), updatedAt: item.offers[0].updatedAt.toISOString() } : null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
