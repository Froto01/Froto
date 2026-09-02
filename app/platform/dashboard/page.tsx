import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

import {
  ArrowLeft,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  Pencil,
  Plus,
  RadioTower,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth-test");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { include: { company: true } } },
  });
  if (!user) redirect("/user-sync");

  const membership = user.companies[0];
  if (!membership) redirect("/company/new");
  const company = membership.company;

  const [
    activeListingCount,
    companyListings,
    activeBidCount,
    activeJobCount,
    wonJobCount,
    completedJobCount,
    jobs,
    recentJobEvents,
    companyTenders,
    responseCount,
    unreadNotificationCount,
  ] = await Promise.all([
    prisma.listing.count({ where: { companyId: company.id, status: "ACTIVE" } }),
    prisma.listing.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bids: true } } },
      take: 12,
    }),
    prisma.bid.count({ where: { bidderCompanyId: company.id, listing: { status: "ACTIVE" } } }),
    prisma.job.count({
      where: {
        OR: [{ buyerCompanyId: company.id }, { providerCompanyId: company.id }],
        status: { not: "COMPLETED" },
      },
    }),
    prisma.job.count({ where: { buyerCompanyId: company.id } }),
    prisma.job.count({
      where: {
        OR: [{ buyerCompanyId: company.id }, { providerCompanyId: company.id }],
        status: "COMPLETED",
      },
    }),
    prisma.job.findMany({
      where: { OR: [{ buyerCompanyId: company.id }, { providerCompanyId: company.id }] },
      orderBy: { updatedAt: "desc" },
      include: {
        listing: { select: { title: true } },
        tender: { select: { title: true } },
        buyerCompany: { select: { name: true } },
        providerCompany: { select: { name: true } },
      },
      take: 8,
    }),
    prisma.jobEvent.findMany({
      where: { job: { OR: [{ buyerCompanyId: company.id }, { providerCompanyId: company.id }] } },
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          include: {
            listing: { select: { title: true } },
            tender: { select: { title: true } },
          },
        },
        actorCompany: { select: { name: true } },
      },
      take: 6,
    }),
    prisma.tender.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { responses: true } } },
      take: 4,
    }),
    prisma.tenderResponse.count({ where: { companyId: company.id } }),
    prisma.notification.count({
      where: {
        companyId: company.id,
        readAt: null,
        OR: [{ recipientUserId: null }, { recipientUserId: user.id }],
      },
    }),
  ]);

  const metrics = [
    { label: "Active listings", value: activeListingCount, detail: "Your live capacity", icon: PackageCheck, tone: "blue", href: "/platform/activity#listings" },
    { label: "Active bids", value: activeBidCount, detail: "Your bids on live listings", icon: BarChart3, tone: "teal", href: "/platform/activity#bids" },
    { label: "Active jobs", value: activeJobCount, detail: "Marketplace + tender jobs", icon: BriefcaseBusiness, tone: "green", href: "/platform/activity#transactions" },
    { label: "Jobs won", value: wonJobCount, detail: "Awards won by your company", icon: RadioTower, tone: "cyan", href: "/platform/activity#awards" },
    { label: "Completed", value: completedJobCount, detail: "Finished Froto jobs", icon: CheckCircle2, tone: "navy", href: "/platform/activity#transactions" },
  ];
  const dashboardLoadedAt = new Date().getTime();

  const toneClasses: Record<string, string> = {
    blue: "bg-blue-50 text-froto-blue ring-blue-100",
    teal: "bg-teal-50 text-froto-teal ring-teal-100",
    green: "bg-emerald-50 text-froto-green ring-emerald-100",
    cyan: "bg-cyan-50 text-froto-cyan ring-cyan-100",
    navy: "bg-slate-100 text-froto-navy ring-slate-200",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/brand/froto-mark.svg" alt="Froto" width={54} height={54} className="h-12 w-12 rounded-2xl bg-froto-ice p-2 ring-1 ring-froto-blue/10" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Froto dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">{company.name}</h1>
              <div className="mt-2 flex items-center gap-2"><Badge className="border border-froto-teal/15 bg-teal-50 text-froto-teal hover:bg-teal-50">{membership.role}</Badge><span className="text-sm text-slate-500">Live company activity</span></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button asChild variant="outline" className="relative gap-2 border-froto-blue/15 bg-white text-froto-navy"><Link href="/platform/notifications"><Bell className="h-4 w-4 text-froto-blue" />Notifications{unreadNotificationCount > 0 ? <Badge className="ml-1 min-w-6 justify-center bg-froto-green px-1.5 text-white">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</Badge> : null}</Link></Button>
            <Button asChild variant="outline" className="gap-2 border-froto-blue/15 bg-white text-froto-navy"><Link href="/platform/activity"><BarChart3 className="h-4 w-4 text-froto-teal" />My Business</Link></Button>
            <Button asChild variant="outline" className="gap-2 border-froto-blue/15 bg-white text-froto-navy"><Link href="/platform/listings/new"><Plus className="h-4 w-4 text-froto-blue" />Create Listing</Link></Button>
            <Button asChild variant="outline" className="gap-2 border-froto-green/15 bg-white text-froto-navy"><Link href="/platform/tenders/new"><ClipboardList className="h-4 w-4 text-froto-green" />Create Tender</Link></Button>
            <Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]"><Link href="/platform/onboarding"><UserPlus className="h-4 w-4" />Company Profile</Link></Button>
            <Button asChild variant="outline" className="gap-2 border-froto-teal/15 bg-white text-froto-navy"><Link href="/platform"><ArrowLeft className="h-4 w-4 text-froto-teal" />Marketplace</Link></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => { const Icon = metric.icon; return <Link key={metric.label} href={metric.href} aria-label={`View ${metric.label.toLowerCase()}`} className="group rounded-[1.4rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-froto-blue focus-visible:ring-offset-2"><Card className="h-full rounded-[1.4rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5 transition group-hover:-translate-y-0.5 group-hover:border-froto-blue/25 group-hover:shadow-lg"><CardContent className="pt-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className="mt-2 text-2xl font-semibold text-froto-navy">{metric.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${toneClasses[metric.tone]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-xs text-slate-500">{metric.detail}</p><p className="mt-2 text-xs font-medium text-froto-blue opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">View details →</p></CardContent></Card></Link>; })}
        </section>

        <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-blue">Capacity controls</p><CardTitle className="mt-1 text-xl text-froto-navy">My listings</CardTitle></div><PackageCheck className="h-5 w-5 text-froto-blue" /></div></CardHeader>
          <CardContent className="space-y-3">
            {companyListings.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No listings yet. Create capacity when you are ready to go to market.</div> : companyListings.map((listing) => {
              const biddingExpired = Boolean(listing.biddingClosesAt && listing.biddingClosesAt.getTime() <= dashboardLoadedAt);
              const displayStatus = listing.status === "ACTIVE" && biddingExpired ? "CLOSED" : listing.status;
              const statusClass = displayStatus === "ACTIVE" ? "bg-froto-green text-white" : displayStatus === "PAUSED" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700";
              return <div key={listing.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{listing.title}</p><Badge className={statusClass}>{statusLabel(displayStatus)}</Badge><Badge className="border border-froto-blue/15 bg-blue-50 text-froto-blue hover:bg-blue-50">{listing._count.bids} bid{listing._count.bids === 1 ? "" : "s"}</Badge></div><p className="mt-1 text-sm text-slate-500">{listing.listingType === "Transport Lane" ? `${listing.origin ?? "Origin"} to ${listing.destination ?? "Destination"}` : listing.location ?? "Warehouse space"}</p><p className="mt-1 text-xs text-slate-500">{displayStatus === "PAUSED" ? "Hidden from the marketplace until reopened" : listing._count.bids === 0 ? "Editable until the first bid is placed" : "Editing locked after bidding started · cancellation still available until award"}</p></div><div className="flex gap-2"><Button asChild variant="outline" className="gap-2 border-froto-blue/15 bg-white text-froto-navy"><Link href={`/platform/listing/${listing.id}`}>View</Link></Button><Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]"><Link href={`/platform/listings/${listing.id}/edit`}><Pencil className="h-4 w-4" />Manage</Link></Button></div></div>;
            })}
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-blue">Post-award work</p><CardTitle className="mt-1 text-xl text-froto-navy">My jobs</CardTitle></div><BriefcaseBusiness className="h-5 w-5 text-froto-blue" /></div></CardHeader>
            <CardContent className="space-y-3">
              {jobs.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No post-award jobs yet. New awards will appear here automatically.</p> : jobs.map((job) => {
                const counterpartyRole = job.buyerCompanyId === company.id ? "Provider" : "Buyer";
                const counterparty = job.buyerCompanyId === company.id ? job.providerCompany.name : job.buyerCompany.name;
                const title = job.listing?.title ?? job.tender?.title ?? "Froto job";
                const source = job.tender ? "Tender" : "Marketplace";
                return <Link key={job.id} href={`/platform/jobs/${job.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-froto-blue/20 hover:bg-blue-50/40"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{title}</p><Badge className="border border-slate-200 bg-white text-slate-600">{source}</Badge></div><p className="mt-1 text-sm text-slate-500">{counterpartyRole} · {counterparty}</p></div><Badge className="bg-froto-navy text-white">{statusLabel(job.status)}</Badge></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Agreed value</span><span className="font-semibold text-froto-blue">{formatAUD(Number(job.amount))}</span></div></Link>;
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-teal">Audit trail</p><CardTitle className="mt-1 text-xl text-froto-navy">Recent job activity</CardTitle></div></CardHeader>
            <CardContent className="space-y-3">
              {recentJobEvents.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">Job events will appear here after your next award.</p> : recentJobEvents.map((event) => {
                const title = event.job.listing?.title ?? event.job.tender?.title ?? "Froto job";
                return <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-froto-navy">{title}</p><p className="mt-1 text-sm text-slate-600">{statusLabel(event.eventType)} · {event.actorCompany?.name ?? "Froto"}</p></div><span className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</span></div></div>;
              })}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-[1.75rem] border-froto-green/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-green">Structured sourcing</p><CardTitle className="mt-1 text-xl text-froto-navy">Tender activity</CardTitle></div><ClipboardList className="h-5 w-5 text-froto-green" /></div></CardHeader>
          <CardContent className="space-y-3">
            {companyTenders.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No tenders created yet. Your company has submitted {responseCount} tender response{responseCount === 1 ? "" : "s"}.</div> : companyTenders.map((tender) => {
              const state = tender.awardedResponseId ? "Awarded" : tender.responseClosesAt.getTime() <= dashboardLoadedAt ? "Closed" : "Open";
              return <Link key={tender.id} href={`/platform/tenders/${tender.id}`} className="block rounded-2xl border border-froto-green/10 bg-emerald-50/30 p-4 transition-colors hover:bg-emerald-50/60"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{tender.title}</p><Badge className={state === "Open" ? "bg-froto-green text-white" : "bg-froto-navy text-white"}>{state}</Badge></div><p className="mt-1 text-sm text-slate-500">{tender._count.responses} response{tender._count.responses === 1 ? "" : "s"}</p></div><span className="text-sm font-medium text-froto-teal">View tender</span></div></Link>;
            })}
            <Button asChild variant="outline" className="border-froto-green/15 text-froto-navy"><Link href="/platform#tenders">Open Tender marketplace</Link></Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
