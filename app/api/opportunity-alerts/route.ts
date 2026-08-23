import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["TRANSPORT_LANE", "WAREHOUSE_SPACE", "TENDER", "GUEST_JOB"]);

async function currentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { take: 1, select: { companyId: true } } },
  });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const preferences = await prisma.opportunityAlertPreference.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    email: user.email,
    homeHref: user.companies.length > 0 ? "/platform/dashboard" : "/platform/guest-dashboard",
    preferences: preferences.map((preference) => ({
      id: preference.id,
      name: preference.name,
      opportunityTypes: preference.opportunityTypes,
      areaKeywords: preference.areaKeywords,
      inAppEnabled: preference.inAppEnabled,
      emailEnabled: preference.emailEnabled,
      active: preference.active,
      createdAt: preference.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid alert preference." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const rawTypes = Array.isArray(body.opportunityTypes) ? body.opportunityTypes : [];
  const opportunityTypes = rawTypes.filter((value): value is string => typeof value === "string" && ALLOWED_TYPES.has(value));
  const rawAreas = Array.isArray(body.areaKeywords) ? body.areaKeywords : [];
  const areaKeywords = Array.from(new Set(rawAreas
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.slice(0, 80)))).slice(0, 20);
  const inAppEnabled = body.inAppEnabled !== false;
  const emailEnabled = body.emailEnabled !== false;

  if (!name) return NextResponse.json({ error: "Give this alert a name." }, { status: 400 });
  if (opportunityTypes.length === 0) return NextResponse.json({ error: "Choose at least one opportunity type." }, { status: 400 });
  if (areaKeywords.length === 0) return NextResponse.json({ error: "Add at least one area keyword." }, { status: 400 });
  if (!inAppEnabled && !emailEnabled) return NextResponse.json({ error: "Choose in-app or email delivery." }, { status: 400 });

  const preference = await prisma.opportunityAlertPreference.create({
    data: {
      userId: user.id,
      companyId: user.companies[0]?.companyId ?? null,
      name,
      opportunityTypes,
      areaKeywords,
      inAppEnabled,
      emailEnabled,
    },
  });

  return NextResponse.json({ id: preference.id }, { status: 201 });
}
