import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createJobFeeSnapshotIfApplicable } from "@/lib/fee-snapshots";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

type AwardResult =
  | {
      ok: true;
      awardedResponseId: string;
      winnerCompanyName: string;
      amount: number;
      awardedAt: string;
      jobId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

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

  let body: { responseId?: string };
  try {
    body = (await request.json()) as { responseId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid award request." }, { status: 400 });
  }

  if (!body.responseId) {
    return NextResponse.json({ error: "Choose a tender response to award." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<AwardResult> => {
        const tender = await tx.tender.findUnique({
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
          return { ok: false, status: 404, error: "Tender not found." };
        }

        if (tender.companyId !== membership.companyId) {
          return { ok: false, status: 403, error: "Only the tender owner can award it." };
        }

        if (tender.awardedResponseId || tender.status === "AWARDED") {
          return { ok: false, status: 409, error: "This tender has already been awarded." };
        }

        if (tender.status !== "OPEN") {
          return { ok: false, status: 409, error: "This tender is no longer available to award." };
        }

        if (tender.responseClosesAt.getTime() > Date.now()) {
          return { ok: false, status: 409, error: "Wait until the response window closes before awarding." };
        }

        const response = tender.responses[0];
        if (!response) {
          return { ok: false, status: 400, error: "That response does not belong to this tender." };
        }

        const allResponses = await tx.tenderResponse.findMany({
          where: { tenderId: tender.id },
          select: { id: true, companyId: true },
        });

        const awardedAt = new Date();

        const claimedAward = await tx.tender.updateMany({
          where: {
            id: tender.id,
            status: "OPEN",
            awardedResponseId: null,
          },
          data: {
            awardedResponseId: response.id,
            awardedAt,
            status: "AWARDED",
          },
        });

        if (claimedAward.count !== 1) {
          return { ok: false, status: 409, error: "This tender has already been awarded." };
        }

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

        await createJobFeeSnapshotIfApplicable({
          tx,
          transactionType: "TENDER_JOB",
          sourceId: createdJob.id,
          transactionAmount: response.amount,
          buyerCompanyId: tender.companyId,
          providerCompanyId: response.companyId,
          calculatedAt: awardedAt,
          metadata: {
            tenderId: tender.id,
            awardedTenderResponseId: response.id,
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

        return {
          ok: true,
          awardedResponseId: response.id,
          winnerCompanyName: response.company.name,
          amount: Number(response.amount),
          awardedAt: awardedAt.toISOString(),
          jobId: createdJob.id,
        };
      },
      { isolationLevel: "Serializable" }
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") {
      return NextResponse.json(
        { error: "This tender changed while you were awarding it. Refresh and try again." },
        { status: 409 }
      );
    }

    throw error;
  }
}
