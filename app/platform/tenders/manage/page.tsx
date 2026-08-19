import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, FileCheck2, Pencil, Send, Trophy } from "lucide-react";

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

function tenderState(tender: { status: string; awardedResponseId: string | null; responseClosesAt: Date }) {
  if (tender.awardedResponseId || tender.status === "AWARDED") return "Awarded";
  if (tender.status === "CANCELLED") return "Cancelled";
  if (tender.status !== "OPEN") return tender.status.charAt(0) + tender.status.slice(1).toLowerCase();
  if (tender.responseClosesAt.getTime() <= Date.now()) return "Responses closed";
  return "Open";
}

export default async function TenderWorkspacePage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth-test");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: { take: 1, include: { company: true } } },
  });

  if (!user) redirect("/user-sync");
  const membership = user.companies[0];
  if (!membership) redirect("/company/new");

  const company = membership.company;
  const [myTenders, myResponses] = await Promise.all([
    prisma.tender.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { responses: true } },
        awardedResponse: { include: { company: { select: { name: true } } } },
      },
      take: 100,
    }),
    prisma.tenderResponse.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        tender: { include: { company: { select: { name: true } } } },
      },
      take: 100,
    }),
  ]);

  const openOwned = myTenders.filter(
    (tender) => tender.status === "OPEN" && !tender.awardedResponseId && tender.responseClosesAt.getTime() > Date.now()
  ).length;
  const responsesWon = myResponses.filter((response) => response.tender.awardedResponseId === response.id).length;
  const liveResponses = myResponses.filter(
    (response) => response.tender.status === "OPEN" && !response.tender.awardedResponseId && response.tender.responseClosesAt.getTime() > Date.now()
  ).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-green/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/brand/froto-mark.svg" alt="Froto" width={54} height={54} className="h-12 w-12 rounded-2xl bg-froto-ice p-2 ring-1 ring-froto-blue/10" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-teal">Tender workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">{company.name}</h1>
              <p className="mt-1 text-sm text-slate-500">Your procurement requests and supplier responses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-2 border-froto-green/15 bg-white text-froto-navy"><Link href="/platform/dashboard"><ArrowLeft className="h-4 w-4 text-froto-teal" />Dashboard</Link></Button>
            <Button asChild className="bg-froto-navy hover:bg-[#0a356f]"><Link href="/platform/tenders/new">Create Tender</Link></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-7">
        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-[1.4rem] border-froto-green/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><ClipboardList className="h-5 w-5 text-froto-green" /><p className="mt-4 text-xs text-slate-500">Open tenders</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{openOwned}</p></CardContent></Card>
          <Card className="rounded-[1.4rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><Send className="h-5 w-5 text-froto-teal" /><p className="mt-4 text-xs text-slate-500">Live responses</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{liveResponses}</p></CardContent></Card>
          <Card className="rounded-[1.4rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5"><CardContent className="pt-6"><Trophy className="h-5 w-5 text-froto-blue" /><p className="mt-4 text-xs text-slate-500">Responses won</p><p className="mt-1 text-2xl font-semibold text-froto-navy">{responsesWon}</p></CardContent></Card>
        </section>

        <Card className="rounded-[1.75rem] border-froto-green/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-xl text-froto-navy"><ClipboardList className="h-5 w-5 text-froto-green" />My Tenders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myTenders.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No tenders created yet.</p> : myTenders.map((tender) => {
              const state = tenderState(tender);
              const editable = tender.status === "OPEN" && !tender.awardedResponseId && tender.responseClosesAt.getTime() > Date.now() && tender._count.responses === 0;
              const cancellable = !tender.awardedResponseId && tender.status !== "AWARDED" && tender.status !== "CANCELLED";
              return (
                <div key={tender.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{tender.title}</p><Badge className={state === "Awarded" ? "bg-froto-green text-white" : state === "Cancelled" ? "bg-slate-500 text-white" : "bg-froto-navy text-white"}>{state}</Badge><Badge className="border border-froto-green/15 bg-emerald-50 text-froto-green hover:bg-emerald-50">{tender._count.responses} response{tender._count.responses === 1 ? "" : "s"}</Badge></div>
                      <p className="mt-1 text-sm text-slate-500">{tender.origin} to {tender.destination} · closes {formatDateTime(tender.responseClosesAt)}</p>
                      {tender.awardedResponse ? <p className="mt-1 text-sm text-froto-green">Awarded to {tender.awardedResponse.company.name} for {formatAUD(Number(tender.awardedResponse.amount))}</p> : null}
                      {editable ? <p className="mt-1 text-xs text-slate-500">Fully editable until the first supplier response.</p> : cancellable ? <p className="mt-1 text-xs text-slate-500">Editing locked. Cancellation remains available until award.</p> : null}
                    </div>
                    <div className="flex gap-2"><Button asChild variant="outline" className="border-froto-green/15 bg-white text-froto-navy"><Link href={`/platform/tenders/${tender.id}`}>View</Link></Button>{(editable || cancellable) ? <Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]"><Link href={`/platform/tenders/${tender.id}/edit`}><Pencil className="h-4 w-4" />Manage</Link></Button> : null}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-xl text-froto-navy"><FileCheck2 className="h-5 w-5 text-froto-teal" />My Tender Responses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myResponses.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No tender responses submitted yet.</p> : myResponses.map((response) => {
              const won = response.tender.awardedResponseId === response.id;
              const unsuccessful = Boolean(response.tender.awardedResponseId) && !won;
              const cancelled = response.tender.status === "CANCELLED";
              const live = response.tender.status === "OPEN" && !response.tender.awardedResponseId && response.tender.responseClosesAt.getTime() > Date.now();
              const outcome = won ? "Won" : unsuccessful ? "Unsuccessful" : cancelled ? "Cancelled" : live ? "Live" : "Awaiting award";
              return (
                <Link key={response.id} href={`/platform/tenders/${response.tenderId}`} className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-froto-teal/20 hover:bg-teal-50/35">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{response.tender.title}</p><Badge className={won ? "bg-froto-green text-white" : unsuccessful || cancelled ? "bg-slate-500 text-white" : "bg-froto-teal text-white"}>{outcome}</Badge></div><p className="mt-1 text-sm text-slate-500">Buyer · {response.tender.company.name}</p><p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(response.createdAt)}</p></div><div className="sm:text-right"><p className="text-xs text-slate-500">Your response</p><p className="font-semibold text-froto-blue">{formatAUD(Number(response.amount))}</p></div></div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
