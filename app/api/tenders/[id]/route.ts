import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();

  let viewerCompanyId: string | null = null;
  let viewerRole: string | null = null;

  if (userId) {
    const viewer = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        companies: {
          take: 1,
          select: { companyId: true, role: true },
        },
      },
    });

    viewerCompanyId = viewer?.companies[0]?.companyId ?? null;
    viewerRole = viewer?.companies[0]?.role ?? null;
  }

  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, verified: true } },
      responses: {
        orderBy: [{ amount: "asc" }, { createdAt: "asc" }],
        include: {
          company: { select: { name: true, verified: true } },
        },
      },
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }

  const responseClosed = tender.responseClosesAt.getTime() <= Date.now();
  const isOwner = viewerCompanyId === tender.companyId;
  const viewerResponse = viewerCompanyId
    ? tender.responses.find((response) => response.companyId === viewerCompanyId)
    : undefined;
  const tenderState = tender.awardedResponseId
    ? "AWARDED"
    : tender.status !== "OPEN"
      ? tender.status
      : responseClosed
        ? "CLOSED"
        : "OPEN";

  const manageRoles = new Set(["OWNER", "ADMIN", "MANAGER"]);
  const canAward =
    isOwner &&
    manageRoles.has(viewerRole ?? "") &&
    tenderState === "CLOSED" &&
    tender.responses.length > 0;

  return NextResponse.json({
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
    status: tender.status,
    tenderState,
    companyName: tender.company.name,
    companyVerified: tender.company.verified,
    isOwner,
    canAward,
    viewerCompanyId,
    hasResponded: Boolean(viewerResponse),
    viewerResponseId: viewerResponse?.id ?? null,
    viewerResponseAmount: viewerResponse ? Number(viewerResponse.amount) : null,
    awardedResponseId: tender.awardedResponseId,
    awardedAt: tender.awardedAt?.toISOString() ?? null,
    responseCount: tender.responses.length,
    responses: tender.responses.map((response) => ({
      id: response.id,
      companyId: response.companyId,
      companyName: response.company.name,
      companyVerified: response.company.verified,
      amount: Number(response.amount),
      serviceDescription: response.serviceDescription,
      leadTime: response.leadTime,
      notes: response.notes,
      status:
        tender.awardedResponseId === response.id
          ? "AWARDED"
          : tender.awardedResponseId
            ? "UNSUCCESSFUL"
            : response.status,
      createdAt: response.createdAt.toISOString(),
    })),
    createdAt: tender.createdAt.toISOString(),
  });
}
