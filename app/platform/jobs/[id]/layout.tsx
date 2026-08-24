import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function formatMinorAUD(value: bigint) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value) / 100);
}

function paymentModeLabel(value: string) {
  if (value === "PLATFORM") return "Platform payment";
  if (value === "COMMERCIAL_TERMS") return "Commercial terms";
  if (value === "MANUAL") return "Manual / external arrangement";
  return "Not set";
}

function paymentStatusLabel(value: string) {
  if (value === "NOT_REQUIRED") return "Not required";
  if (value === "REQUIRES_ACTION") return "Action required";
  if (value === "PARTIALLY_REFUNDED") return "Partially refunded";
  return value === "UNSET"
    ? "Not set"
    : value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}

export default async function JobDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return children;

  const { id } = await params;

  const [user, job] = await Promise.all([
    prisma.user.findUnique({
      where: { clerkId: userId },
      select: { companies: { select: { companyId: true } } },
    }),
    prisma.job.findUnique({
      where: { id },
      select: {
        buyerCompanyId: true,
        providerCompanyId: true,
        buyerCompany: { select: { id: true, name: true } },
        providerCompany: { select: { id: true, name: true } },
        commercialTransaction: {
          select: {
            grossAmountMinor: true,
            currency: true,
            paymentMode: true,
            paymentStatus: true,
            paymentTerms: true,
            charges: {
              where: { chargeType: "SUCCESS_FEE" },
              select: {
                amountMinor: true,
                taxAmountMinor: true,
                status: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const canViewJob = Boolean(
    job &&
      user?.companies.some(
        (membership) =>
          membership.companyId === job.buyerCompanyId ||
          membership.companyId === job.providerCompanyId
      )
  );

  if (!job || !canViewJob) return children;

  const commercial = job.commercialTransaction;
  const successFee = commercial?.charges[0] ?? null;

  return (
    <>
      {children}

      <section className="mx-auto -mt-10 max-w-5xl px-4 pb-28">
        <div className="rounded-[1.8rem] border border-froto-blue/10 bg-white p-6 shadow-md shadow-froto-navy/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">
                Commercial record
              </p>
              <h2 className="mt-1 text-xl font-semibold text-froto-navy">Financial summary</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                This records the commercial side of the award separately from the operational job workflow.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Provider-neutral
            </span>
          </div>

          {commercial ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-blue-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-froto-blue">Contract value</p>
                <p className="mt-1 text-lg font-semibold text-froto-navy">
                  {commercial.currency === "AUD" ? formatMinorAUD(commercial.grossAmountMinor) : `${commercial.currency} ${Number(commercial.grossAmountMinor) / 100}`}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment arrangement</p>
                <p className="mt-1 font-semibold text-froto-navy">{paymentModeLabel(commercial.paymentMode)}</p>
                {commercial.paymentTerms ? <p className="mt-1 text-xs text-slate-500">{commercial.paymentTerms}</p> : null}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment status</p>
                <p className="mt-1 font-semibold text-froto-navy">{paymentStatusLabel(commercial.paymentStatus)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Froto fee</p>
                {successFee ? (
                  <>
                    <p className="mt-1 font-semibold text-froto-navy">{formatMinorAUD(successFee.amountMinor + successFee.taxAmountMinor)}</p>
                    <p className="mt-1 text-xs text-slate-500">{paymentStatusLabel(successFee.status)}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-semibold text-froto-navy">Pending commercial policy</p>
                    <p className="mt-1 text-xs text-slate-500">No success fee has been activated or calculated.</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
              This is an earlier job without a commercial-ledger record. New awards create this record automatically.
            </div>
          )}
        </div>
      </section>

      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-froto-navy/10 backdrop-blur">
        <Link
          href={`/platform/companies/${job.buyerCompany.id}`}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-froto-navy transition hover:bg-blue-50"
        >
          Buyer profile · {job.buyerCompany.name}
        </Link>
        <Link
          href={`/platform/companies/${job.providerCompany.id}`}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-froto-navy transition hover:bg-emerald-50"
        >
          Provider profile · {job.providerCompany.name}
        </Link>
      </div>
    </>
  );
}
