import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { decimalToMinorUnits } from "@/lib/money";
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
      company: { select: { name: true } },
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

  if (tender.status !== "OPEN") {
    return NextResponse.json({ error: "This tender is no longer available to award." }, { status: 409 });
  }

  if (tender.responseClosesAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "Wait until the response window closes before awarding." }, { status: 409 });
  }

  const response = tender.responses[0];
  if (!response) {
    return NextResponse.json({ error: "That response does not belong to this tender." }, { status: 400 });
  }

  const awardedAt = new Date();

  const job = await prisma.$transaction(async (tx) => {
    const allResponses = await tx.tenderResponse.findMany({
      where: { tenderId: tender.id },
      select: { id: true, companyId: true },
    });

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

    const createdJob = await tx.job.create({
      data: {
        tenderId: tender.id,
        awardedTenderResponseId: response.id,
        buyerCompanyId: tender.companyId,
        providerCompanyId: response.companyId,
        amount: response.amount,
        status: "AWARDED",
      },
    });

    await tx.commercialTransaction.create({
      data: {
        jobId: createdJob.id,
        buyerCompanyId: tender.companyId,
        providerCompanyId: response.companyId,
        grossAmountMinor: decimalToMinorUnits(response.amount),
        awardedAt,
      },
    });

    await tx.jobEvent.create({
      data: {
        jobId: createdJob.id,
        eventType: "AWARDED",
        actorUserId: user.id,
        actorCompanyId: membership.companyId,
        metadata: {
          sourceType: "TENDER",
          tenderId: tender.id,
          tenderTitle: tender.title,
          buyerCompanyName: tender.company.name,
          providerCompanyName: response.company.name,
          amount: Number(response.amount),
        },
      },
    });

    await tx.notification.create({
      data: {
        companyId: response.companyId,
        type: "TENDER_AWARD_WON",
        title: "You won a tender",
        message: `Your company was selected for ${tender.title}. Open the job to continue.`,
        href: `/platform/jobs/${createdJob.id}`,
        metadata: { tenderId: tender.id, responseId: response.id, jobId: createdJob.id },
      },
    });

    for (const item of allResponses) {
      if (item.companyId === response.companyId) continue;
      await tx.notification.create({
        data: {
          companyId: item.companyId,
          type: "TENDER_AWARD_UNSUCCESSFUL",
          title: "Tender award result",
          message: `Another supplier was selected for ${tender.title}.`,
          href: `/platform/tenders/${tender.id}`,
          metadata: { tenderId: tender.id, responseId: item.id, awardedResponseId: response.id },
        },
      });
    }

    return createdJob;
  });

  return NextResponse.json({
    success: true,
    awardedResponseId: response.id,
    winnerCompanyName: response.company.name,
    amount: Number(response.amount),
    awardedAt: awardedAt.toISOString(),
    jobId: job.id,
  });
}
