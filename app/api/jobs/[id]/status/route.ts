import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BUYER_ACTION_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "DISPATCHER",
  "WAREHOUSE",
  "STAFF",
]);

const PROVIDER_ACTION_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "DISPATCHER",
  "WAREHOUSE",
]);

type JobStatus = "AWARDED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED";

type TransitionRule = {
  from: JobStatus;
  to: JobStatus;
  actor: "BUYER" | "PROVIDER";
};

const TRANSITIONS: TransitionRule[] = [
  { from: "AWARDED", to: "ACCEPTED", actor: "BUYER" },
  { from: "ACCEPTED", to: "IN_PROGRESS", actor: "PROVIDER" },
  { from: "IN_PROGRESS", to: "COMPLETED", actor: "PROVIDER" },
];

function isJobStatus(value: unknown): value is JobStatus {
  return (
    value === "AWARDED" ||
    value === "ACCEPTED" ||
    value === "IN_PROGRESS" ||
    value === "COMPLETED"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to update a Froto job." },
      { status: 401 }
    );
  }

  const { id: jobId } = await params;

  let body: { status?: unknown; note?: unknown };

  try {
    body = (await request.json()) as { status?: unknown; note?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid job update." }, { status: 400 });
  }

  if (!isJobStatus(body.status)) {
    return NextResponse.json(
      { error: "Choose a valid job status." },
      { status: 400 }
    );
  }

  const nextStatus: JobStatus = body.status;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Complete your Froto user setup before updating jobs." },
      { status: 409 }
    );
  }

  const membership = user.companies[0];

  if (!membership) {
    return NextResponse.json(
      { error: "Create or join a company before updating jobs." },
      { status: 409 }
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          buyerCompany: { select: { name: true } },
          providerCompany: { select: { name: true } },
        },
      });

      if (!job) {
        return { ok: false as const, status: 404, error: "Job not found." };
      }

      if (
        membership.companyId !== job.buyerCompanyId &&
        membership.companyId !== job.providerCompanyId
      ) {
        return {
          ok: false as const,
          status: 403,
          error: "This job does not belong to your company.",
        };
      }

      const currentStatus = job.status as JobStatus;
      const rule = TRANSITIONS.find(
        (transition) =>
          transition.from === currentStatus && transition.to === nextStatus
      );

      if (!rule) {
        return {
          ok: false as const,
          status: 409,
          error: `Job cannot move from ${currentStatus} to ${nextStatus}.`,
        };
      }

      const isBuyer = membership.companyId === job.buyerCompanyId;
      const isProvider = membership.companyId === job.providerCompanyId;

      if (rule.actor === "BUYER" && !isBuyer) {
        return {
          ok: false as const,
          status: 403,
          error: "The buyer company must accept this awarded job first.",
        };
      }

      if (rule.actor === "PROVIDER" && !isProvider) {
        return {
          ok: false as const,
          status: 403,
          error: "The provider company controls this operational status.",
        };
      }

      if (
        (rule.actor === "BUYER" && !BUYER_ACTION_ROLES.has(membership.role)) ||
        (rule.actor === "PROVIDER" && !PROVIDER_ACTION_ROLES.has(membership.role))
      ) {
        return {
          ok: false as const,
          status: 403,
          error: "Your company role cannot perform this job action.",
        };
      }

      const now = new Date();
      const timestampUpdate =
        nextStatus === "ACCEPTED"
          ? { acceptedAt: now }
          : nextStatus === "IN_PROGRESS"
            ? { startedAt: now }
            : nextStatus === "COMPLETED"
              ? { completedAt: now }
              : {};

      const updatedJob = await tx.job.update({
        where: { id: job.id },
        data: {
          status: nextStatus,
          ...timestampUpdate,
          events: {
            create: {
              eventType: nextStatus,
              actorUserId: user.id,
              actorCompanyId: membership.companyId,
              note: note || null,
              metadata: {
                fromStatus: currentStatus,
                toStatus: nextStatus,
                buyerCompanyName: job.buyerCompany.name,
                providerCompanyName: job.providerCompany.name,
              },
            },
          },
        },
        include: {
          buyerCompany: { select: { name: true } },
          providerCompany: { select: { name: true } },
        },
      });

      if (nextStatus === "ACCEPTED") {
        await tx.notification.create({
          data: {
            companyId: job.providerCompanyId,
            type: "JOB_ACTION_REQUIRED",
            title: "Job accepted · ready to start",
            message: `${job.buyerCompany.name} accepted the awarded job. Your company can now move it into progress.`,
            href: `/platform/jobs/${job.id}`,
            metadata: { jobId: job.id, requiredAction: "IN_PROGRESS" },
          },
        });
      } else if (nextStatus === "IN_PROGRESS") {
        await tx.notification.create({
          data: {
            companyId: job.buyerCompanyId,
            type: "JOB_STATUS_UPDATED",
            title: "Job is in progress",
            message: `${job.providerCompany.name} has started the job.`,
            href: `/platform/jobs/${job.id}`,
            metadata: { jobId: job.id, status: "IN_PROGRESS" },
          },
        });
      } else if (nextStatus === "COMPLETED") {
        await tx.notification.create({
          data: {
            companyId: job.buyerCompanyId,
            type: "JOB_COMPLETED",
            title: "Job completed",
            message: `${job.providerCompany.name} marked the job as completed.`,
            href: `/platform/jobs/${job.id}`,
            metadata: { jobId: job.id, status: "COMPLETED" },
          },
        });
      }

      return {
        ok: true as const,
        job: {
          id: updatedJob.id,
          status: updatedJob.status,
          acceptedAt: updatedJob.acceptedAt?.toISOString() ?? null,
          startedAt: updatedJob.startedAt?.toISOString() ?? null,
          completedAt: updatedJob.completedAt?.toISOString() ?? null,
          buyerCompanyName: updatedJob.buyerCompany.name,
          providerCompanyName: updatedJob.providerCompany.name,
        },
      };
    },
    { isolationLevel: "Serializable" }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.job, { status: 200 });
}
