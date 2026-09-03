import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Landmark,
  Percent,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function CommercialAdminPage() {
  await requirePlatformAdmin();

  const [jobs, fees, companyCount] = await Promise.all([
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { title: true } },
        tender: { select: { title: true } },
        buyerCompany: { select: { name: true } },
        providerCompany: { select: { name: true } },
      },
    }),
    prisma.transactionFee.findMany({
      orderBy: { calculatedAt: "desc" },
      take: 100,
    }),
    prisma.company.count(),
  ]);

  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const completedJobs = jobs.filter((job) => job.status === "COMPLETED");
  const awardedGmv = jobs.reduce((sum, job) => sum + Number(job.amount), 0);
  const completedGmv = completedJobs.reduce((sum, job) => sum + Number(job.amount), 0);
  const calculatedFees = fees
    .filter((fee) => !["VOID", "REFUNDED"].includes(fee.status))
    .reduce((sum, fee) => sum + Number(fee.feeExGst), 0);
  const earnedFees = fees
    .filter((fee) => ["EARNED", "INVOICED", "PAID"].includes(fee.status))
    .reduce((sum, fee) => sum + Number(fee.feeExGst), 0);
  const paidFees = fees
    .filter((fee) => fee.status === "PAID")
    .reduce((sum, fee) => sum + Number(fee.feeExGst), 0);
  const outstandingFees = fees
    .filter((fee) => ["EARNED", "INVOICED"].includes(fee.status))
    .reduce((sum, fee) => sum + Number(fee.feeExGst), 0);
  const earnedGst = fees
    .filter((fee) => ["EARNED", "INVOICED", "PAID"].includes(fee.status))
    .reduce((sum, fee) => sum + Number(fee.gstAmount), 0);
  const takeRate = completedGmv > 0 ? (earnedFees / completedGmv) * 100 : 0;

  const metrics = [
    { label: "Awarded GMV", value: formatAUD(awardedGmv), detail: "All awarded Froto work", icon: Landmark },
    { label: "Completed GMV", value: formatAUD(completedGmv), detail: "Confirmed completed work", icon: BriefcaseBusiness },
    { label: "Fees calculated", value: formatAUD(calculatedFees), detail: "Ex GST fee snapshots", icon: ReceiptText },
    { label: "Fees earned", value: formatAUD(earnedFees), detail: "Ex GST after completion", icon: CircleDollarSign },
    { label: "Fees paid", value: formatAUD(paidFees), detail: "Ex GST cash collected", icon: WalletCards },
    { label: "Outstanding", value: formatAUD(outstandingFees), detail: "Earned or invoiced, unpaid", icon: ReceiptText },
    { label: "GST on earned fees", value: formatAUD(earnedGst), detail: "GST recorded separately", icon: CircleDollarSign },
    { label: "Effective take rate", value: `${takeRate.toFixed(2)}%`, detail: "Earned fees ÷ completed GMV", icon: Percent },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-froto-navy text-white shadow-md shadow-froto-navy/15">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Froto administration</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">Commercial performance</h1>
              <p className="mt-1 text-sm text-slate-500">Platform GMV, success fees and transaction audit records</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2 border-froto-green/15 bg-white text-froto-navy">
              <Link href="/platform/admin/verifications"><Building2 className="h-4 w-4 text-froto-green" />Verifications</Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 border-froto-blue/15 bg-white text-froto-navy">
              <Link href="/platform/dashboard"><ArrowLeft className="h-4 w-4 text-froto-blue" />Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="rounded-[1.5rem] border-froto-blue/10 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-froto-navy">{metric.value}</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-froto-ice text-froto-blue">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{metric.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-[1.5rem] border-froto-teal/10 bg-white shadow-sm">
            <CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Companies</p><p className="mt-2 text-3xl font-semibold text-froto-navy">{companyCount}</p></CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-froto-teal/10 bg-white shadow-sm">
            <CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Jobs awarded</p><p className="mt-2 text-3xl font-semibold text-froto-navy">{jobs.length}</p></CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-froto-teal/10 bg-white shadow-sm">
            <CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Jobs completed</p><p className="mt-2 text-3xl font-semibold text-froto-navy">{completedJobs.length}</p></CardContent>
          </Card>
        </section>

        <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-green">Froto revenue register</p>
              <CardTitle className="mt-1 text-xl text-froto-navy">Transaction fees</CardTitle>
              <p className="mt-2 text-sm text-slate-500">Fee revenue excludes GST. Values are frozen against the rule version applied at award.</p>
            </div>
          </CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-500">
                No fee snapshots yet. New marketplace and tender awards will appear here after the approved rules deploy.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Transaction</th>
                      <th className="px-3 py-3">Buyer</th>
                      <th className="px-3 py-3">Provider / payer</th>
                      <th className="px-3 py-3 text-right">Job value</th>
                      <th className="px-3 py-3 text-right">Fee ex GST</th>
                      <th className="px-3 py-3 text-right">GST</th>
                      <th className="px-3 py-3 text-right">Total</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((fee) => {
                      const job = jobById.get(fee.sourceId);
                      const title = job?.listing?.title ?? job?.tender?.title ?? fee.transactionType.replaceAll("_", " ");
                      return (
                        <tr key={fee.id} className="border-b border-slate-100 align-top">
                          <td className="px-3 py-4">
                            <p className="font-semibold text-froto-navy">{title}</p>
                            <p className="mt-1 text-xs text-slate-500">{fee.feeRuleCode} v{fee.feeRuleVersion} · {formatDate(fee.calculatedAt)}</p>
                          </td>
                          <td className="px-3 py-4 text-slate-600">{job?.buyerCompany.name ?? "Guest buyer"}</td>
                          <td className="px-3 py-4 text-slate-600">{job?.providerCompany.name ?? "Provider company"}</td>
                          <td className="px-3 py-4 text-right font-medium text-froto-navy">{formatAUD(Number(fee.transactionAmount))}</td>
                          <td className="px-3 py-4 text-right text-froto-navy">{formatAUD(Number(fee.feeExGst))}</td>
                          <td className="px-3 py-4 text-right text-slate-600">{formatAUD(Number(fee.gstAmount))}</td>
                          <td className="px-3 py-4 text-right font-semibold text-froto-blue">{formatAUD(Number(fee.feeInclGst))}</td>
                          <td className="px-3 py-4"><Badge className={fee.status === "PAID" ? "bg-froto-green text-white" : fee.status === "EARNED" ? "bg-froto-blue text-white" : "bg-froto-navy text-white"}>{statusLabel(fee.status)}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
