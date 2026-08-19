import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to award this tender." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 403 });
  }

  const membership = user.companies[0];
  if (!membership || !MANAGE_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Your company role cannot award tenders." }, { status: 403 });
  }

  const body = (await request.json()) as { responseId?: string };
  if (!body.responseId) {
    return NextResponse.json({ error: "Choose a tender response to award." }, { status: 400 });
  }

  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      responses: {
        where: { id: body.responseId },
        include: { company: { select: { name: true } } },
      },
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }

  if (tender.companyId !== membership.companyId) {
    return NextResponse.json({ error: "Only the tender owner can award it." }, { status: 403 });
  }

  if (tender.awardedResponseId || tender.status === "AWARDED") {
    return NextResponse.json({ error: "This tender has already been awarded." }, { status: 409 });
  }

  if (tender.responseClosesAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "Wait until the response window closes before awarding." }, { status: 409 });
  }

  const response = tender.responses[0];
  if (!response) {
    return NextResponse.json({ error: "That response does not belong to this tender." }, { status: 400 });
  }

  const awardedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.tender.update({
      where: { id: tender.id },
      data: {
        awardedResponseId: response.id,
        awardedAt,
        status: "AWARDED",
      },
    });

    await tx.tenderResponse.updateMany({
      where: { tenderId: tender.id },
      data: { status: "UNSUCCESSFUL" },
    });

    await tx.tenderResponse.update({
      where: { id: response.id },
      data: { status: "AWARDED" },
    });
  });

  return NextResponse.json({
    success: true,
    awardedResponseId: response.id,
    winnerCompanyName: response.company.name,
    amount: Number(response.amount),
    awardedAt: awardedAt.toISOString(),
  });
}
