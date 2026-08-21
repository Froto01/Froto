import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

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

  return (
    <>
      {children}
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
