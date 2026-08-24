import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function formatMinorAUD(value: bigint) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value) / 100);
}

function label(value: string) {
  if (value === "UNSET") return "Not set";
  if (value === "NOT_REQUIRED") return "Not required";
  if (value === "REQUIRES_ACTION") return "Action required";
  if (value === "COMMERCIAL_TERMS") return "Commercial terms";
  if (value === "PLATFORM") return "Platform payment";
  if (value === "MANUAL") return "Manual / external arrangement";
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}

export default async function GuestAuctionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return children;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, companies: { select: { companyId: true } } },
  });

  if (!user) return children;

  const auction = await prisma.guestAuction.findUnique({
    where: { id },
    select: {
      createdByUserId: true,
      awardedBid: { select: { bidderCompanyId: true } },
      commercialTransaction: {
        select: {
          grossAmountMinor: true,
          currency: true,
          paymentMode: true,
          paymentStatus: true,
          paymentTerms: true,
          charges: {
            where: { chargeType: "SUCCESS_FEE" },
            select: { amountMinor: true, taxAmountMinor: true, status: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!auction) return children;

  const viewerIsCustomer = auction.createdByUserId === user.id;
  const viewerIsWinner = Boolean(
    auction.awardedBid && user.companies.some((membership) => membership.companyId === auction.awardedBid?.bidderCompanyId)
  );

  if (!viewerIsCustomer && !viewerIsWinner) return children;

  const commercial = auction.commercialTransaction;
  const successFee = commercial?.charges[0] ?? null;

  return (
    <>
      {children}
      {commercial ? (
        <section className="mx-auto -mt-8 max-w-5xl px-4 pb-12">
          <div className="rounded-[1.8rem] border border-froto-blue/10 bg-white p-6 shadow-md shadow-froto-navy/5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Commercial record</p>
            <h2 className="mt-1 text-xl font-semibold text-froto-navy">Financial summary</h2>
            <p className="mt-1 text-sm text-slate-500">Visible only to the customer and the awarded provider.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-blue-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-froto-blue">Contract value</p>
                <p className="mt-1 text-lg font-semibold text-froto-navy">
                  {commercial.currency === "AUD" ? formatMinorAUD(commercial.grossAmountMinor) : `${commercial.currency} ${Number(commercial.grossAmountMinor) / 100}`}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment arrangement</p>
                <p className="mt-1 font-semibold text-froto-navy">{label(commercial.paymentMode)}</p>
                {commercial.paymentTerms ? <p className="mt-1 text-xs text-slate-500">{commercial.paymentTerms}</p> : null}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment status</p>
                <p className="mt-1 font-semibold text-froto-navy">{label(commercial.paymentStatus)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Froto fee</p>
                {successFee ? (
                  <>
                    <p className="mt-1 font-semibold text-froto-navy">{formatMinorAUD(successFee.amountMinor + successFee.taxAmountMinor)}</p>
                    <p className="mt-1 text-xs text-slate-500">{label(successFee.status)}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-semibold text-froto-navy">Pending commercial policy</p>
                    <p className="mt-1 text-xs text-slate-500">No success fee has been activated or calculated.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
