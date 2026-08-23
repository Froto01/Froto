import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3, History, PackageCheck, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(value); }

export default async function GuestDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth-test");
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { select: { companyId: true } } } });
  if (!user) redirect("/user-sync");
  if (user.companies.length > 0) redirect("/platform/dashboard");

  const auctions = await prisma.guestAuction.findMany({ where: { createdByUserId: user.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { bids: true } }, awardedBid: { include: { bidderCompany: { select: { name: true, verified: true } } } } } });
  const openCount = auctions.filter((a) => a.status === "OPEN").length;
  const awardedCount = auctions.filter((a) => a.awardedBidId !== null).length;
  const totalBids = auctions.reduce((sum, a) => sum + a._count.bids, 0);

  return <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16"><div className="mx-auto max-w-5xl px-4 py-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Guest dashboard</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-froto-navy">My transport requests</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">A simple view of the jobs you have posted, company offers received and your awarded transport work.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/platform">Marketplace</Link></Button><Button asChild className="bg-froto-navy hover:bg-[#0a356f]"><Link href="/platform/guest-auctions">Post a job</Link></Button></div></div>
    <section className="mt-7 grid gap-4 sm:grid-cols-3"><Card className="rounded-[1.4rem] border-froto-blue/10 bg-white shadow-sm"><CardContent className="pt-6"><Clock3 className="h-5 w-5 text-froto-blue" /><p className="mt-3 text-xs text-slate-500">Open requests</p><p className="mt-1 text-3xl font-semibold text-froto-navy">{openCount}</p></CardContent></Card><Card className="rounded-[1.4rem] border-froto-teal/10 bg-white shadow-sm"><CardContent className="pt-6"><PackageCheck className="h-5 w-5 text-froto-teal" /><p className="mt-3 text-xs text-slate-500">Company offers received</p><p className="mt-1 text-3xl font-semibold text-froto-navy">{totalBids}</p></CardContent></Card><Card className="rounded-[1.4rem] border-amber-200 bg-white shadow-sm"><CardContent className="pt-6"><Trophy className="h-5 w-5 text-amber-500" /><p className="mt-3 text-xs text-slate-500">Jobs awarded</p><p className="mt-1 text-3xl font-semibold text-froto-navy">{awardedCount}</p></CardContent></Card></section>
    <Card className="mt-7 rounded-[1.7rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5"><CardHeader><CardTitle className="flex items-center gap-2 text-froto-navy"><History className="h-5 w-5 text-froto-blue" />Request history</CardTitle></CardHeader><CardContent className="space-y-3">{auctions.length === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">You have not posted a transport request yet.</div> : auctions.map((auction) => <Link key={auction.id} href={`/platform/guest-auctions/${auction.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-froto-blue/20 hover:bg-blue-50/30"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{auction.title}</p><Badge className={auction.status === "AWARDED" ? "bg-emerald-600 text-white" : "bg-froto-navy text-white"}>{auction.status}</Badge></div><p className="mt-1 text-sm text-slate-500">{auction.pickupLocation} → {auction.deliveryLocation}</p></div><ArrowRight className="h-4 w-4 text-froto-blue" /></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{auction._count.bids} offer{auction._count.bids === 1 ? "" : "s"}</span><span>{auction.status === "OPEN" ? `Closes ${formatDateTime(auction.auctionClosesAt)}` : `Updated ${formatDateTime(auction.updatedAt)}`}</span>{auction.awardedBid ? <span className="font-medium text-froto-teal">Awarded to {auction.awardedBid.bidderCompany.name}{auction.awardedBid.bidderCompany.verified ? " · Verified" : ""}</span> : null}</div></Link>)}</CardContent></Card>
  </div></main>;
}
