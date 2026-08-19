import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

async function getViewer() {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });
}

export async function GET() {
  const viewer = await getViewer();
  const viewerCompanyId = viewer?.companies[0]?.companyId ?? null;

  const tenders = await prisma.tender.findMany({
    where: { status: { in: ["OPEN", "AWARDED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true, verified: true } },
      responses: {
        select: { id: true, companyId: true, amount: true },
        orderBy: { amount: "asc" },
      },
    },
  });

  const now = Date.now();

  return NextResponse.json(
    tenders.map((tender) => {
      const responseClosed = tender.responseClosesAt.getTime() <= now;
      const viewerResponse = viewerCompanyId
        ? tender.responses.find((response) => response.companyId === viewerCompanyId)
        : undefined;

      return {
        id: tender.id,
        title: tender.title,
        productDescription: tender.productDescription,
        volume: tender.volume,
        origin: tender.origin,
        destination: tender.destination,
        storageRequired: tender.storageRequired,
        temperatureRequirement: tender.temperatureRequirement,
        deliveryDate: tender.deliveryDate.toISOString(),
        responseClosesAt: tender.responseClosesAt.toISOString(),
        responseClosed,
        notes: tender.notes,
        status: tender.awardedResponseId ? "AWARDED" : responseClosed ? "CLOSED" : tender.status,
        companyName: tender.company.name,
        companyVerified: tender.company.verified,
        responseCount: tender.responses.length,
        bestResponseAmount:
          tender.responses.length > 0 ? Number(tender.responses[0].amount) : null,
        isOwner: viewerCompanyId === tender.companyId,
        hasResponded: Boolean(viewerResponse),
        viewerResponseAmount: viewerResponse ? Number(viewerResponse.amount) : null,
        awardedResponseId: tender.awardedResponseId,
        awardedAt: tender.awardedAt?.toISOString() ?? null,
        createdAt: tender.createdAt.toISOString(),
      };
    })
  );
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Sign in to create a tender." }, { status: 401 });
  }

  const membership = viewer.companies[0];
  if (!membership) {
    return NextResponse.json({ error: "Create a company before creating a tender." }, { status: 403 });
  }

  if (!MANAGE_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Your company role cannot create tenders." }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    productDescription?: string;
    volume?: string;
    origin?: string;
    destination?: string;
    storageRequired?: boolean;
    temperatureRequirement?: string;
    deliveryDate?: string;
    responseClosesAt?: string;
    notes?: string;
  };

  const title = body.title?.trim() ?? "";
  const productDescription = body.productDescription?.trim() ?? "";
  const volume = body.volume?.trim() ?? "";
  const origin = body.origin?.trim() ?? "";
  const destination = body.destination?.trim() ?? "";
  const deliveryDate = new Date(body.deliveryDate ?? "");
  const responseClosesAt = new Date(body.responseClosesAt ?? "");

  if (!title || !productDescription || !volume || !origin || !destination) {
    return NextResponse.json({ error: "Complete all required tender fields." }, { status: 400 });
  }

  if (Number.isNaN(deliveryDate.getTime())) {
    return NextResponse.json({ error: "Provide a valid delivery date." }, { status: 400 });
  }

  if (Number.isNaN(responseClosesAt.getTime()) || responseClosesAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Response close time must be in the future." }, { status: 400 });
  }

  if (deliveryDate.getTime() < responseClosesAt.getTime()) {
    return NextResponse.json({ error: "Delivery date must be after the response close time." }, { status: 400 });
  }

  const tender = await prisma.tender.create({
    data: {
      companyId: membership.companyId,
      createdByUserId: viewer.id,
      title,
      productDescription,
      volume,
      origin,
      destination,
      storageRequired: Boolean(body.storageRequired),
      temperatureRequirement: body.temperatureRequirement?.trim() || null,
      deliveryDate,
      responseClosesAt,
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json({ success: true, tenderId: tender.id }, { status: 201 });
}
