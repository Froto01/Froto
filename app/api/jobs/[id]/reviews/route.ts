import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REVIEW_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to review this job." }, { status: 401 });
  }

  let body: { rating?: unknown; comment?: unknown };

  try {
    body = (await request.json()) as { rating?: unknown; comment?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  }

  if (comment.length > 1000) {
    return NextResponse.json({ error: "Keep the review to 1,000 characters or fewer." }, { status: 400 });
  }

  const { id: jobId } = await params;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Complete your Froto user setup first." }, { status: 409 });
  }

  const membership = user.companies[0];

  if (!membership) {
    return NextResponse.json({ error: "Create or join a company before reviewing jobs." }, { status: 409 });
  }

  if (!REVIEW_ROLES.has(membership.role)) {
    return NextResponse.json(
      { error: "Only company owners, admins and managers can submit reviews." },
      { status: 403 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          buyerCompany: { select: { name: true } },
          providerCompany: { select: { name: true } },
          reviews: { where: { reviewerCompanyId: membership.companyId }, select: { id: true } },
        },
      });

      if (!job) return { ok: false as const, status: 404, error: "Job not found." };

      const isBuyer = membership.companyId === job.buyerCompanyId;
      const isProvider = membership.companyId === job.providerCompanyId;

      if (!isBuyer && !isProvider) {
        return { ok: false as const, status: 403, error: "This job does not belong to your company." };
      }

      if (job.status !== "COMPLETED") {
        return { ok: false as const, status: 409, error: "Reviews open after the job is completed." };
      }

      if (job.reviews.length > 0) {
        return { ok: false as const, status: 409, error: "Your company has already reviewed this job." };
      }

      const reviewedCompanyId = isBuyer ? job.providerCompanyId : job.buyerCompanyId;
      const reviewedCompanyName = isBuyer ? job.providerCompany.name : job.buyerCompany.name;

      const review = await tx.review.create({
        data: {
          jobId: job.id,
          reviewerCompanyId: membership.companyId,
          reviewedCompanyId,
          reviewerUserId: user.id,
          rating,
          comment: comment || null,
        },
      });

      await tx.notification.create({
        data: {
          companyId: reviewedCompanyId,
          type: "REVIEW_RECEIVED",
          title: "New verified company review",
          message: `${membership.companyId === job.buyerCompanyId ? job.buyerCompany.name : job.providerCompany.name} left a ${rating}-star review.`,
          href: `/platform/jobs/${job.id}`,
          metadata: { jobId: job.id, reviewId: review.id, rating },
        },
      });

      return {
        ok: true as const,
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          reviewedCompanyId,
          reviewedCompanyName,
          createdAt: review.createdAt.toISOString(),
        },
      };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.review, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Your company has already reviewed this job." }, { status: 409 });
    }

    throw error;
  }
}
