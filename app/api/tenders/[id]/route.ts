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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const viewer = await getViewer();
  const membership = viewer?.companies[0] ?? null;
  const viewerCompanyId = membership?.companyId ?? null;
  const viewerRole = membership?.role ?? null;

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

  const canManage = isOwner && MANAGE_ROLES.has(viewerRole ?? "");
  const canEdit =
    canManage &&
    tenderState === "OPEN" &&
    tender.responses.length === 0;
  const canCancel =
    canManage &&
    !tender.awardedResponseId &&
    tender.status !== "CANCELLED";
  const canAward =
    canManage &&
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
    canEdit,
    canCancel,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Sign in to edit this tender." }, { status: 401 });
  }

  const membership = viewer.companies[0];
  if (!membership) {
    return NextResponse.json({ error: "Create or join a company before editing tenders." }, { status: 403 });
  }

  if (!MANAGE_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Your company role cannot edit tenders." }, { status: 403 });
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

  try {
    const tender = await prisma.$transaction(
      async (tx) => {
        const current = await tx.tender.findUnique({
          where: { id },
          include: { _count: { select: { responses: true } } },
        });

        if (!current) {
          throw new Error("NOT_FOUND");
        }

        if (current.companyId !== membership.companyId) {
          throw new Error("FORBIDDEN");
        }

        if (current.status !== "OPEN" || current.awardedResponseId) {
          throw new Error("LOCKED");
        }

        if (current.responseClosesAt.getTime() <= Date.now()) {
          throw new Error("CLOSED");
        }

        if (current._count.responses > 0) {
          throw new Error("RESPONSES_EXIST");
        }

        return tx.tender.update({
          where: { id },
          data: {
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
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ success: true, tenderId: tender.id });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Tender not found." }, { status: 404 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Only the tender owner can edit it." }, { status: 403 });
      }
      if (error.message === "RESPONSES_EXIST") {
        return NextResponse.json(
          { error: "Editing is locked after the first supplier response is submitted." },
          { status: 409 }
        );
      }
      if (error.message === "CLOSED") {
        return NextResponse.json({ error: "This tender has already closed for responses." }, { status: 409 });
      }
      if (error.message === "LOCKED") {
        return NextResponse.json({ error: "This tender can no longer be edited." }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Froto could not update this tender." }, { status: 500 });
  }
}
