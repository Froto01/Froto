import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  let companyId: string | null = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        companies: {
          select: { companyId: true },
          take: 1,
        },
      },
    });

    companyId = user?.companies[0]?.companyId ?? null;
  }

  return (
    <>
      {children}
      {companyId ? (
        <Link
          href={`/platform/companies/${companyId}`}
          className="fixed bottom-5 right-5 z-40 rounded-full border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-froto-navy shadow-lg shadow-froto-navy/10 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50"
        >
          View my reputation
        </Link>
      ) : null}
    </>
  );
}
