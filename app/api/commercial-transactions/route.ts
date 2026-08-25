import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to view financial records." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  const companyId = user?.companies[0]?.companyId ?? null;

  if (!companyId) {
    return NextResponse.json(
      { error: "Create or join a company before viewing financial records." },
      { status: 409 }
    );
  }

  const transactions = await prisma.commercialTransaction.findMany({
    where: {
      OR: [{ buyerCompanyId: companyId }, { providerCompanyId: companyId }],
    },
    orderBy: { awardedAt: "desc" },
    include: {
      buyerCompany: { select: { id: true, name: true } },
      providerCompany: { select: { id: true, name: true } },
      job: {
        include: {
          listing: { select: { id: true, title: true } },
          tender: { select: { id: true, title: true } },
        },
      },
      guestAuction: {
        select: { id: true, title: true },
      },
      charges: {
        select: {
          chargeType: true,
          status: true,
          amountMinor: true,
          taxAmountMinor: true,
          currency: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        select: {
          invoiceType: true,
          invoiceNumber: true,
          status: true,
          subtotalMinor: true,
          taxAmountMinor: true,
          totalMinor: true,
          currency: true,
          issuedAt: true,
          dueAt: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          amountMinor: true,
          currency: true,
          occurredAt: true,
        },
      },
      adjustments: {
        select: {
          adjustmentType: true,
          amountMinor: true,
          taxAmountMinor: true,
          currency: true,
          occurredAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    transactions.map((transaction) => {
      const source = transaction.job?.listing
        ? {
            type: "MARKETPLACE" as const,
            title: transaction.job.listing.title,
            href: `/platform/jobs/${transaction.jobId}`,
          }
        : transaction.job?.tender
          ? {
              type: "TENDER" as const,
              title: transaction.job.tender.title,
              href: `/platform/jobs/${transaction.jobId}`,
            }
          : transaction.guestAuction
            ? {
                type: "GUEST_JOB" as const,
                title: transaction.guestAuction.title,
                href: `/platform/guest-auctions/${transaction.guestAuction.id}`,
              }
            : {
                type: "TRANSACTION" as const,
                title: "Commercial transaction",
                href: null,
              };

      const chargeTotalMinor = transaction.charges.reduce(
        (sum, charge) => sum + charge.amountMinor + charge.taxAmountMinor,
        BigInt(0)
      );
      const paidTotalMinor = transaction.payments
        .filter((payment) => payment.status === "PAID")
        .reduce((sum, payment) => sum + payment.amountMinor, BigInt(0));
      const adjustmentTotalMinor = transaction.adjustments.reduce(
        (sum, adjustment) => sum + adjustment.amountMinor + adjustment.taxAmountMinor,
        BigInt(0)
      );

      return {
        id: transaction.id,
        source,
        viewerSide: transaction.buyerCompanyId === companyId ? "BUYER" : "PROVIDER",
        counterpartyName:
          transaction.buyerCompanyId === companyId
            ? transaction.providerCompany.name
            : transaction.buyerCompany?.name ?? "Personal customer",
        grossAmountMinor: transaction.grossAmountMinor.toString(),
        currency: transaction.currency,
        paymentMode: transaction.paymentMode,
        paymentStatus: transaction.paymentStatus,
        settlementStatus: transaction.settlementStatus,
        paymentTerms: transaction.paymentTerms,
        awardedAt: transaction.awardedAt.toISOString(),
        chargeTotalMinor: chargeTotalMinor.toString(),
        paidTotalMinor: paidTotalMinor.toString(),
        adjustmentTotalMinor: adjustmentTotalMinor.toString(),
        invoiceCount: transaction.invoices.length,
        latestInvoice: transaction.invoices[0]
          ? {
              invoiceType: transaction.invoices[0].invoiceType,
              invoiceNumber: transaction.invoices[0].invoiceNumber,
              status: transaction.invoices[0].status,
              totalMinor: transaction.invoices[0].totalMinor.toString(),
              currency: transaction.invoices[0].currency,
              issuedAt: transaction.invoices[0].issuedAt?.toISOString() ?? null,
              dueAt: transaction.invoices[0].dueAt?.toISOString() ?? null,
            }
          : null,
      };
    })
  );
}
