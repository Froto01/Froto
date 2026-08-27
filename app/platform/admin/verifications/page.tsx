import Link from "next/link";
import { ArrowLeft, BadgeCheck, ShieldCheck } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { VerificationReviewCard } from "./review-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function VerificationAdminPage() {
  await requirePlatformAdmin();

  const [submittedCompanies, verifiedCount, rejectedCount] = await Promise.all([
    prisma.company.findMany({
      where: { verificationStatus: "SUBMITTED" },
      orderBy: { verificationSubmittedAt: "asc" },
      select: {
        id: true,
        name: true,
        abn: true,
        acn: true,
        companyType: true,
        locations: true,
        notes: true,
        verificationSubmittedAt: true,
      },
    }),
    prisma.company.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.company.count({ where: { verificationStatus: "REJECTED" } }),
  ]);

  const reviewItems = submittedCompanies.map((company) => ({
    ...company,
    verificationSubmittedAt: company.verificationSubmittedAt?.toISOString() ?? null,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-froto-navy text-white shadow-md shadow-froto-navy/15">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Froto administration</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">Company verification review</h1>
            </div>
          </div>

          <Button asChild variant="outline" className="gap-2 border-froto-blue/15 bg-white text-froto-navy">
            <Link href="/platform/dashboard"><ArrowLeft className="h-4 w-4 text-froto-blue" />Back to dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-7">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Awaiting review", submittedCompanies.length],
            ["Verified companies", verifiedCount],
            ["Needs attention", rejectedCount],
          ].map(([label, value]) => (
            <Card key={label} className="rounded-[1.5rem] border-froto-blue/10 bg-white shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-froto-navy">{value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="rounded-[1.7rem] border-froto-blue/10 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-teal">Trust queue</p>
                <CardTitle className="mt-1 text-xl text-froto-navy">Submitted companies</CardTitle>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Review company details, including ABN and ACN where supplied, before allowing the Verified badge to appear across Froto. Rejections require a note so the company has a clear path to resubmit.</p>
              </div>
              <BadgeCheck className="h-5 w-5 text-froto-green" />
            </div>
          </CardHeader>
        </Card>

        {reviewItems.length === 0 ? (
          <Card className="rounded-[1.7rem] border-emerald-100 bg-emerald-50/55 shadow-sm">
            <CardContent className="p-8 text-center">
              <BadgeCheck className="mx-auto h-8 w-8 text-froto-green" />
              <p className="mt-3 font-semibold text-froto-navy">Verification queue is clear</p>
              <p className="mt-1 text-sm text-slate-500">New company verification requests will appear here automatically.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {reviewItems.map((company) => <VerificationReviewCard key={company.id} company={company} />)}
          </div>
        )}
      </div>
    </main>
  );
}