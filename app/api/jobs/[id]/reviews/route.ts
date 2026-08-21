import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REVIEW_ACTION_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

function serializeReview(review: {
  id: string;
  jobId: string;
  reviewerCompanyId: string;
  revieweeCompanyId: string;
  reviewerUserId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

async function getReviewContext(jobId: string, clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    include: { companies: true },
  });

  if (!user) {
    return {
      ok: false as const,
      status: 409,
      error: "Complete your Froto user setup before reviewing jobs.",
    };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      buyerCompanyId: true,
      providerCompanyId: true,
      buyerCompany: { select: { id: true, name: true } },
      providerCompany: { select: { id: true, name: true } },
    },
  });

  if (!job) {
    return { ok: false as const, status: 404, error: "Job not found." };
  }

  const membership = user.companies.find(
    (item) =>
      item.companyId === job.buyerCompanyId ||
      item.companyId === job.providerCompanyId
  );

  if (!membership) {
    return {
      ok: false as const,
      status: 403,
      error: "Only companies involved in this job can access its reviews.",
    };
  }

  const reviewerCompanyId = membership.companyId;
  const revieweeCompany =
    reviewerCompanyId === job.buyerCompanyId
      ? job.providerCompany
      : job.buyerCompany;

  return {
    ok: true as const,
    user,
    membership,
    job,
    reviewerCompanyId,
    revieweeCompany,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to view job reviews." },
      { status: 401 }
    );
  }

  const { id: jobId } = await params;
  const context = await getReviewContext(jobId, userId);

  if (!context.ok) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status }
    );
  }

  const reviews = await prisma.review.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
  });

  const ownReview = reviews.find(
    (review) => review.reviewerCompanyId === context.reviewerCompanyId
  );

  return NextResponse.json({
    eligible:
      context.job.status === "COMPLETED" &&
      REVIEW_ACTION_ROLES.has(context.membership.role) &&
      !ownReview,
    jobStatus: context.job.status,
    revieweeCompany: context.revieweeCompany,
    ownReview: ownReview ? serializeReview(ownReview) : null,
    reviews: reviews.map(serializeReview),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to leave a review." },
      { status: 401 }
    );
  }

  const { id: jobId } = await params;
  const context = await getReviewContext(jobId, userId);

  if (!context.ok) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status }
    );
  }

  if (context.job.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Reviews are available only after the job is completed." },
      { status: 409 }
    );
  }

  if (!REVIEW_ACTION_ROLES.has(context.membership.role)) {
    return NextResponse.json(
      { error: "Only an owner, admin or manager can submit a company review." },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  const payload = body as { rating?: unknown; comment?: unknown };
  const rating =
    typeof payload.rating === "number" && Number.isInteger(payload.rating)
      ? payload.rating
      : NaN;
  const comment =
    typeof payload.comment === "string"
      ? payload.comment.trim().slice(0, 1000)
      : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Choose a rating from 1 to 5 stars." },
      { status: 400 }
    );
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      jobId_reviewerCompanyId: {
        jobId,
        reviewerCompanyId: context.reviewerCompanyId,
      },
    },
  });

  if (existingReview) {
    return NextResponse.json(
      { error: "Your company has already reviewed this job." },
      { status: 409 }
    );
  }

  const review = await prisma.review.create({
    data: {
      jobId,
      reviewerCompanyId: context.reviewerCompanyId,
      revieweeCompanyId: context.revieweeCompany.id,
      reviewerUserId: context.user.id,
      rating,
      comment: comment || null,
    },
  });

  return NextResponse.json({ review: serializeReview(review) }, { status: 201 });
}
