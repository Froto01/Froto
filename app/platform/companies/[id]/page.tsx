import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, MapPin, Star, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function Stars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconClass} ${star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
    </div>
  );
}

export default async function CompanyReputationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/auth-test");

  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      verified: true,
      verificationStatus: true,
      companyType: true,
      locations: true,
      notes: true,
      createdAt: true,
    },
  });

  if (!company) notFound();

  const [reputation, completedJobs, recentReviews] = await Promise.all([
    prisma.review.aggregate({
      where: { reviewedCompanyId: company.id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.job.count({
      where: {
        status: "COMPLETED",
        OR: [{ buyerCompanyId: company.id }, { providerCompanyId: company.id }],
      },
    }),
    prisma.review.findMany({
      where: { reviewedCompanyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        jobId: true,
        reviewerCompany: {
          select: { id: true, name: true, verified: true },
        },
      },
    }),
  ]);

  const average = reputation._avg.rating;
  const reviewCount = reputation._count.rating;

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-5xl px-4 py-7">
        <Button asChild variant="outline" className="mb-6 gap-2 border-froto-blue/15 bg-white text-froto-navy">
          <Link href="/platform/dashboard">
            <ArrowLeft className="h-4 w-4 text-froto-blue" />
            Back to dashboard
          </Link>
        </Button>

        <Card className="overflow-hidden rounded-[2rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
          <div className="h-2 bg-gradient-to-r from-froto-blue via-froto-teal to-froto-green" />
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-froto-ice text-froto-blue ring-1 ring-froto-blue/10">
                  <Building2 className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-froto-navy">{company.name}</h1>
                    {company.verified ? (
                      <Badge className="gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified company
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {company.companyType ?? "Froto marketplace company"}
                  </p>
                  {company.locations ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-froto-teal" />
                      {company.locations}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="min-w-56 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Froto reputation</p>
                {reviewCount > 0 && average !== null ? (
                  <>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-3xl font-semibold text-froto-navy">{average.toFixed(1)}</span>
                      <span className="pb-1 text-sm text-slate-500">/ 5</span>
                    </div>
                    <div className="mt-2"><Stars rating={average} /></div>
                    <p className="mt-2 text-sm text-slate-600">
                      {reviewCount} verified review{reviewCount === 1 ? "" : "s"}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No verified reviews yet.</p>
                )}
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-blue-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-froto-blue">Verified reviews</p>
                <p className="mt-1 text-2xl font-semibold text-froto-navy">{reviewCount}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-froto-green">Completed Froto jobs</p>
                <p className="mt-1 text-2xl font-semibold text-froto-navy">{completedJobs}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Froto member since</p>
                <p className="mt-1 font-semibold text-froto-navy">{formatDate(company.createdAt)}</p>
              </div>
            </div>

            {company.notes ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company profile</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{company.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-[1.8rem] border-amber-200/70 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Transaction-backed feedback</p>
                <CardTitle className="mt-1 text-xl text-froto-navy">Verified reviews</CardTitle>
              </div>
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-sm text-slate-500">Every review below came from a company involved in a completed Froto job.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentReviews.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-500">
                This company has not received a verified Froto review yet.
              </div>
            ) : (
              recentReviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-froto-navy">{review.reviewerCompany.name}</p>
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Verified job</Badge>
                      </div>
                      <div className="mt-2"><Stars rating={review.rating} size="sm" /></div>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                  </div>
                  {review.comment ? (
                    <p className="mt-3 text-sm leading-6 text-slate-700">{review.comment}</p>
                  ) : (
                    <p className="mt-3 text-sm italic text-slate-500">Rating submitted without a written comment.</p>
                  )}
                  <Button asChild variant="link" className="mt-2 h-auto p-0 text-froto-blue">
                    <Link href={`/platform/jobs/${review.jobId}`}>View verified job</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
