import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["TRANSPORT_LANE", "WAREHOUSE_SPACE", "TENDER", "GUEST_JOB"]);
const MAX_ALERTS_PER_USER = 20;

async function currentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { take: 1, select: { companyId: true } } },
  });
}

function uniqueAreas(values: unknown[]) {
  const unique = new Map<string, string>();

  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, 80);
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("en-AU");
    if (!unique.has(key)) unique.set(key, trimmed);
    if (unique.size >= 20) break;
  }

  return [...unique.values()];
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

  const existingCount = await prisma.opportunityAlertPreference.count({ where: { userId: user.id } });
  if (existingCount >= MAX_ALERTS_PER_USER) {
    return NextResponse.json(
      { error: `You can save up to ${MAX_ALERTS_PER_USER} opportunity alerts. Delete an old alert before adding another.` },
      { status: 409 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const rawTypes = Array.isArray(body.opportunityTypes) ? body.opportunityTypes : [];
  const opportunityTypes = Array.from(new Set(
    rawTypes.filter((value): value is string => typeof value === "string" && ALLOWED_TYPES.has(value))
  ));
  const rawAreas = Array.isArray(body.areaKeywords) ? body.areaKeywords : [];
  const areaKeywords = uniqueAreas(rawAreas);
  const inAppEnabled = typeof body.inAppEnabled === "boolean" ? body.inAppEnabled : true;
  const emailEnabled = typeof body.emailEnabled === "boolean" ? body.emailEnabled : true;

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
