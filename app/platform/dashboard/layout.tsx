import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BellRing, Star } from "lucide-react";

import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth-test");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, companies: { select: { companyId: true }, take: 1 } },
  });
  if (!user) redirect("/user-sync");

  const companyId = user.companies[0]?.companyId ?? null;
  if (!companyId) redirect("/platform/guest-dashboard");

  const [activeGuestJobCount, companyReviews, guestReviews, activeAlertCount] = await Promise.all([
    prisma.guestAuctionBid.count({
      where: {
        bidderCompanyId: companyId,
        status: "AWARDED",
        auction: { status: { in: ["AWARDED", "ACCEPTED", "IN_PROGRESS", "DELIVERED"] } },
      },
    }),
    prisma.review.findMany({ where: { reviewedCompanyId: companyId }, select: { rating: true } }),
    prisma.guestAuctionReview.findMany({ where: { reviewedCompanyId: companyId }, select: { rating: true } }),
    prisma.opportunityAlertPreference.count({ where: { userId: user.id, active: true } }),
  ]);

  const ratings = [...companyReviews, ...guestReviews].map((review) => review.rating);
  const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;

  return (
    <>
      {children}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        {activeGuestJobCount > 0 ? (
          <Link href="/platform/guest-auctions" className="rounded-full border border-cyan-200 bg-froto-navy px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-froto-navy/15 transition hover:-translate-y-0.5 hover:bg-[#0a356f]">
            Guest jobs · {activeGuestJobCount}
          </Link>
        ) : null}
        <Link href="/platform/opportunity-alerts" className="flex items-center gap-2 rounded-full border border-froto-blue/15 bg-white px-4 py-2.5 text-sm font-semibold text-froto-navy shadow-lg shadow-froto-navy/10 transition hover:-translate-y-0.5 hover:bg-blue-50">
          <BellRing className="h-4 w-4 text-froto-blue" />Opportunity alerts{activeAlertCount > 0 ? ` · ${activeAlertCount}` : ""}
        </Link>
        <Link href={`/platform/companies/${companyId}`} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-froto-navy shadow-lg shadow-froto-navy/10 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">My Froto reputation</span>
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <Star className={`h-4 w-4 ${average !== null ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
            {average !== null ? `${average.toFixed(1)} / 5` : "No rating yet"}
            <span className="font-normal text-slate-500">· {ratings.length} verified review{ratings.length === 1 ? "" : "s"}</span>
          </span>
          <span className="mt-1 block text-xs font-medium text-froto-blue">View reputation & reviews</span>
        </Link>
      </div>
    </>
  );
}
