import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  ListChecks,
  PackageCheck,
  Pencil,
  Send,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function prettyStatus(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "UNSUCCESSFUL") return "Unsuccessful";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function listingStatus(status: string, biddingClosesAt: Date | null, awardedBidId: string | null) {
  if (awardedBidId || status === "AWARDED") return "Awarded";
  if (status === "CANCELLED") return "Cancelled";
  if (status !== "ACTIVE") return prettyStatus(status);
  if (biddingClosesAt && biddingClosesAt.getTime() <= Date.now()) return "Bidding closed";
  return "Live";
}

function tenderStatus(status: string, responseClosesAt: Date, awardedResponseId: string | null) {
  if (awardedResponseId || status === "AWARDED") return "Awarded";
  if (status === "CANCELLED") return "Cancelled";
  if (status !== "OPEN") return prettyStatus(status);
  if (responseClosesAt.getTime() <= Date.now()) return "Responses closed";
  return "Live";
}

export default async function ActivityPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth-test");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { take: 1, include: { company: true } } },
  });

  if (!user) redirect("/user-sync");
  const membership = user.companies[0];
  if (!membership) redirect("/start");

  const company = membership.company;

  const [listings, bids, tenders, tenderResponses, jobs] = await Promise.all([
    prisma.listing.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { bids: true } },
        awardedBid: { include: { bidderCompany: { select: { name: true } } } },
      },
      take: 50,
    }),
    prisma.bid.findMany({
      where: { bidderCompanyId: company.id },
      orderBy: { createdAt: "desc" },
      include: { listing: { include: { company: { select: { name: true } } } } },
      take: 100,
    }),
    prisma.tender.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { responses: true } },
        awardedResponse: { include: { company: { select: { name: true } } } },
      },
      take: 50,
    }),
    prisma.tenderResponse.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        tender: {
          include: {
            company: { select: { name: true } },
          },
        },
      },
      take: 100,
    }),
    prisma.job.findMany({
      where: { OR: [{ buyerCompanyId: company.id }, { providerCompanyId: company.id }] },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { title: true } },
        tender: { select: { title: true } },
        buyerCompany: { select: { name: true } },
        providerCompany: { select: { name: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
      take: 100,
    }),
  ]);

  const completedJobs = jobs.filter((job) => job.status === "COMPLETED");
  const wonBids = bids.filter((bid) => bid.listing.awardedBidId === bid.id).length;
  const wonTenderResponses = tenderResponses.filter((response) => response.status === "AWARDED").length;
  const activeBidListings = new Set(
    bids
      .filter((bid) => bid.listing.status === "ACTIVE" && !bid.listing.awardedBidId)
      .map((bid) => bid.listingId)
  ).size;
  const completedValue = completedJobs.reduce((sum, job) => sum + Number(job.amount), 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/brand/froto-mark.svg" alt="Froto" width={54} height={54} className="h-12 w-12 rounded-2xl bg-froto-ice p-2 ring-1 ring-froto-blue/10" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Company activity</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">{company.name}</h1>
              <p className="mt-1 text-sm text-slate-500">Listings, bids, tenders and Froto transaction history</p>
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2 border-froto-blue/15 bg-white text-froto-navy">
            <Link href="/platform/dashboard"><ArrowLeft className="h-4 w-4 text-froto-blue" />Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="rounded-[1.4rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><PackageCheck className="h-5 w-5 text-froto-blue" /><p className="mt-4 text-xs font-medium text-slate-500">All listings</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{listings.length}</p></CardContent></Card>
          <Card className="rounded-[1.4rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><BarChart3 className="h-5 w-5 text-froto-teal" /><p className="mt-4 text-xs font-medium text-slate-500">Listings bidding on</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{activeBidListings}</p></CardContent></Card>
          <Card className="rounded-[1.4rem] border-froto-green/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><ClipboardList className="h-5 w-5 text-froto-green" /><p className="mt-4 text-xs font-medium text-slate-500">My tenders</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{tenders.length}</p></CardContent></Card>
          <Card className="rounded-[1.4rem] border-froto-cyan/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><Trophy className="h-5 w-5 text-froto-cyan" /><p className="mt-4 text-xs font-medium text-slate-500">Awards won</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{wonBids + wonTenderResponses}</p></CardContent></Card>
          <Card className="rounded-[1.4rem] border-froto-navy/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><CircleDollarSign className="h-5 w-5 text-froto-navy" /><p className="mt-4 text-xs font-medium text-slate-500">Completed job value</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{formatAUD(completedValue)}</p></CardContent></Card>
        </section>

        <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-blue">Supply side</p><CardTitle className="mt-1 text-xl text-froto-navy">My Listings</CardTitle></div><ListChecks className="h-5 w-5 text-froto-blue" /></div></CardHeader>
          <CardContent className="space-y-3">
            {listings.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No listings yet.</p> : listings.map((listing) => {
              const state = listingStatus(listing.status, listing.biddingClosesAt, listing.awardedBidId);
              return <div key={listing.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{listing.title}</p><Badge className="bg-froto-navy text-white">{state}</Badge><Badge className="border border-froto-blue/15 bg-blue-50 text-froto-blue hover:bg-blue-50">{listing._count.bids} bid{listing._count.bids === 1 ? "" : "s"}</Badge></div><p className="mt-1 text-sm text-slate-500">{listing.listingType === "Transport Lane" ? `${listing.origin ?? "Origin"} to ${listing.destination ?? "Destination"}` : listing.location ?? "Warehouse space"}</p>{listing.awardedBid ? <p className="mt-1 text-sm text-froto-green">Awarded to {listing.awardedBid.bidderCompany.name} for {formatAUD(Number(listing.awardedBid.amount))}</p> : null}</div><div className="flex gap-2"><Button asChild variant="outline" className="border-froto-blue/15 bg-white text-froto-navy"><Link href={`/platform/listing/${listing.id}`}>View</Link></Button>{listing.status === "ACTIVE" && !listing.awardedBidId ? <Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]"><Link href={`/platform/listings/${listing.id}/edit`}><Pencil className="h-4 w-4" />Manage</Link></Button> : null}</div></div></div>;
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-teal">Marketplace demand</p><CardTitle className="mt-1 text-xl text-froto-navy">My Bids</CardTitle></div><BarChart3 className="h-5 w-5 text-froto-teal" /></div></CardHeader>
          <CardContent className="space-y-3">
            {bids.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No bids placed yet.</p> : bids.map((bid) => {
              const won = bid.listing.awardedBidId === bid.id;
              const lost = Boolean(bid.listing.awardedBidId) && !won;
              const outcome = won ? "Won" : lost ? "Unsuccessful" : bid.listing.status === "CANCELLED" ? "Cancelled" : "Live";
              return <Link key={bid.id} href={`/platform/listing/${bid.listingId}`} className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-froto-teal/20 hover:bg-teal-50/35"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{bid.listing.title}</p><Badge className={won ? "bg-froto-green text-white" : lost ? "bg-slate-500 text-white" : "bg-froto-teal text-white"}>{outcome}</Badge></div><p className="mt-1 text-sm text-slate-500">Provider · {bid.listing.company.name}</p><p className="mt-1 text-xs text-slate-500">Placed {formatDateTime(bid.createdAt)}</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-500">Your bid</p><p className="font-semibold text-froto-blue">{formatAUD(Number(bid.amount))}</p></div></div></Link>;
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-froto-green/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-green">Structured sourcing</p><CardTitle className="mt-1 text-xl text-froto-navy">My Tenders</CardTitle></div><ClipboardList className="h-5 w-5 text-froto-green" /></div></CardHeader>
          <CardContent className="space-y-3">
            {tenders.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No tenders created yet.</p> : tenders.map((tender) => {
              const state = tenderStatus(tender.status, tender.responseClosesAt, tender.awardedResponseId);
              return <div key={tender.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{tender.title}</p><Badge className="bg-froto-green text-white">{state}</Badge><Badge className="border border-froto-green/15 bg-emerald-50 text-froto-green hover:bg-emerald-50">{tender._count.responses} response{tender._count.responses === 1 ? "" : "s"}</Badge></div><p className="mt-1 text-sm text-slate-500">{tender.origin} to {tender.destination}</p><p className="mt-1 text-xs text-slate-500">Responses close {formatDateTime(tender.responseClosesAt)}</p>{tender.awardedResponse ? <p className="mt-1 text-sm text-froto-green">Awarded to {tender.awardedResponse.company.name} for {formatAUD(Number(tender.awardedResponse.amount))}</p> : null}</div><div className="flex gap-2"><Button asChild variant="outline" className="border-froto-green/15 bg-white text-froto-navy"><Link href={`/platform/tenders/${tender.id}`}>View</Link></Button>{tender.status === "OPEN" && !tender.awardedResponseId ? <Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]"><Link href={`/platform/tenders/${tender.id}/manage`}><Pencil className="h-4 w-4" />Manage</Link></Button> : null}</div></div></div>;
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-cyan-100 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-cyan">Supplier responses</p><CardTitle className="mt-1 text-xl text-froto-navy">My Tender Responses</CardTitle></div><Send className="h-5 w-5 text-froto-cyan" /></div></CardHeader>
          <CardContent className="space-y-3">
            {tenderResponses.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No tender responses submitted yet.</p> : tenderResponses.map((response) => {
              const effective = response.status === "SUBMITTED" && response.tender.responseClosesAt.getTime() <= Date.now() ? "Closed" : prettyStatus(response.status);
              return <Link key={response.id} href={`/platform/tenders/${response.tenderId}`} className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-froto-cyan/20 hover:bg-cyan-50/30"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{response.tender.title}</p><Badge className={response.status === "AWARDED" ? "bg-froto-green text-white" : response.status === "UNSUCCESSFUL" ? "bg-slate-500 text-white" : "bg-froto-cyan text-white"}>{effective}</Badge></div><p className="mt-1 text-sm text-slate-500">Buyer · {response.tender.company.name}</p><p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(response.createdAt)}</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-500">Your response</p><p className="font-semibold text-froto-blue">{formatAUD(Number(response.amount))}</p></div></div></Link>;
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-froto-green/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-green">Commercial record</p><CardTitle className="mt-1 text-xl text-froto-navy">Transaction History</CardTitle></div><BriefcaseBusiness className="h-5 w-5 text-froto-green" /></div></CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">Awarded transactions will appear here automatically.</p> : jobs.map((job) => {
              const isBuyer = job.buyerCompanyId === company.id;
              const counterpartyRole = isBuyer ? "Provider" : "Buyer";
              const counterparty = isBuyer ? job.providerCompany.name : job.buyerCompany.name;
              const sourceTitle = job.listing?.title ?? job.tender?.title ?? "Froto transaction";
              const sourceType = job.tender ? "Tender" : "Marketplace";
              return <Link key={job.id} href={`/platform/jobs/${job.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-froto-green/20 hover:bg-emerald-50/30"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{sourceTitle}</p><Badge className={job.status === "COMPLETED" ? "bg-froto-green text-white" : "bg-froto-navy text-white"}>{prettyStatus(job.status)}</Badge><Badge className="border border-slate-200 bg-white text-slate-600">{sourceType}</Badge></div><p className="mt-1 text-sm text-slate-500">{counterpartyRole} · {counterparty}</p><p className="mt-1 text-xs text-slate-500">Awarded {formatDateTime(job.createdAt)} · {job.events.length} lifecycle event{job.events.length === 1 ? "" : "s"}</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-500">Agreed value</p><p className="font-semibold text-froto-blue">{formatAUD(Number(job.amount))}</p>{job.status === "COMPLETED" ? <p className="mt-1 flex items-center gap-1 text-xs font-medium text-froto-green sm:justify-end"><CheckCircle2 className="h-3.5 w-3.5" />Completed</p> : null}</div></div></Link>;
            })}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
