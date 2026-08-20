"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, ClipboardList, Clock3, Send, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TenderResponse = {
  id: string;
  companyId: string;
  companyName: string;
  companyVerified: boolean;
  amount: number;
  serviceDescription: string | null;
  leadTime: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

type Tender = {
  id: string;
  title: string;
  productDescription: string;
  volume: string;
  origin: string;
  destination: string;
  storageRequired: boolean;
  temperatureRequirement: string | null;
  deliveryDate: string;
  responseClosesAt: string;
  responseClosed: boolean;
  notes: string | null;
  status: string;
  tenderState: string;
  companyName: string;
  companyVerified: boolean;
  isOwner: boolean;
  canAward: boolean;
  viewerCompanyId: string | null;
  hasResponded: boolean;
  viewerResponseId: string | null;
  viewerResponseAmount: number | null;
  viewerResponseStatus: string | null;
  awardedResponseId: string | null;
  awardedCompanyName: string | null;
  awardedAmount: number | null;
  awardedAt: string | null;
  responseCount: number;
  responses: TenderResponse[];
  jobId: string | null;
  jobStatus: string | null;
  canOpenJob: boolean;
};

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function stateLabel(state: string) {
  if (state === "AWARDED") return "Awarded";
  if (state === "CANCELLED") return "Cancelled";
  if (state === "CLOSED") return "Responses closed";
  return "Open for responses";
}

function jobStatusLabel(status: string | null) {
  if (!status) return "Job created";
  if (status === "IN_PROGRESS") return "In progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function TenderDetailPage() {
  const params = useParams<{ id: string }>();
  const [tender, setTender] = useState<Tender | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awardingId, setAwardingId] = useState<string | null>(null);

  const loadTender = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch(`/api/tenders/${params.id}`, { cache: "no-store" });
      const data = (await response.json()) as Tender & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Tender not found.");
      setTender(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Tender not found.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadTender();
    const timer = window.setInterval(() => void loadTender(false), 10000);
    return () => window.clearInterval(timer);
  }, [loadTender]);

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setActionError("Enter a quote amount greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch(`/api/tenders/${params.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, serviceDescription, leadTime, notes }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Your response could not be submitted.");
      setActionSuccess("Tender response submitted and saved to Froto.");
      setAmount("");
      setServiceDescription("");
      setLeadTime("");
      setNotes("");
      await loadTender(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Your response could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function awardResponse(responseItem: TenderResponse) {
    const confirmed = window.confirm(
      `Award this tender to ${responseItem.companyName} for ${formatAUD(responseItem.amount)}?`
    );
    if (!confirmed) return;

    setAwardingId(responseItem.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch(`/api/tenders/${params.id}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId: responseItem.id }),
      });
      const data = (await response.json()) as { error?: string; winnerCompanyName?: string; amount?: number };
      if (!response.ok) throw new Error(data.error ?? "The tender could not be awarded.");
      setActionSuccess(
        `Tender awarded to ${data.winnerCompanyName ?? responseItem.companyName} for ${formatAUD(data.amount ?? responseItem.amount)}.`
      );
      await loadTender(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The tender could not be awarded.");
    } finally {
      setAwardingId(null);
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white p-8 text-sm text-slate-500">Loading tender...</main>;
  }

  if (!tender || loadError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white p-8">
        <div className="mx-auto max-w-4xl">
          <Button asChild variant="outline" className="mb-5"><Link href="/platform#tenders"><ArrowLeft className="mr-2 h-4 w-4" />Back to tenders</Link></Button>
          <Card><CardContent className="p-6 text-sm text-slate-600">{loadError ?? "Tender not found."}</CardContent></Card>
        </div>
      </main>
    );
  }

  const canRespond = !tender.isOwner && tender.tenderState === "OPEN" && !tender.hasResponded && Boolean(tender.viewerCompanyId);

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-6xl px-4 py-7">
        <Button asChild variant="outline" className="mb-6 gap-2 border-froto-green/15 bg-white text-froto-navy"><Link href="/platform#tenders"><ArrowLeft className="h-4 w-4 text-froto-teal" />Back to tenders</Link></Button>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/10 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-teal via-froto-cyan to-froto-green" />
            <CardHeader className="border-b border-froto-green/10 bg-emerald-50/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-teal">Tender opportunity</p>
                  <CardTitle className="mt-2 text-3xl text-froto-navy">{tender.title}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">Issued by {tender.companyName}{tender.companyVerified ? " · Verified" : ""}</p>
                </div>
                <Badge className={tender.tenderState === "AWARDED" ? "bg-froto-green text-white" : tender.tenderState === "CLOSED" || tender.tenderState === "CANCELLED" ? "bg-froto-navy text-white" : "bg-froto-teal text-white"}>{stateLabel(tender.tenderState)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Requirement</p>
                <p className="mt-2 font-medium text-froto-navy">{tender.productDescription}</p>
                <p className="mt-2 text-sm text-slate-600">{tender.volume}</p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-froto-blue/10 bg-blue-50/40 p-4"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-froto-blue">Route</dt><dd className="mt-1 font-medium text-froto-navy">{tender.origin} to {tender.destination}</dd></div>
                <div className="rounded-2xl border border-froto-green/10 bg-emerald-50/40 p-4"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-froto-green">Delivery date</dt><dd className="mt-1 font-medium text-froto-navy">{formatDate(tender.deliveryDate)}</dd></div>
                <div className="rounded-2xl border border-froto-teal/10 bg-teal-50/40 p-4"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-froto-teal">Storage</dt><dd className="mt-1 font-medium text-froto-navy">{tender.storageRequired ? "Required" : "Not required"}</dd></div>
                <div className="rounded-2xl border border-froto-cyan/10 bg-cyan-50/40 p-4"><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-froto-cyan">Temperature</dt><dd className="mt-1 font-medium text-froto-navy">{tender.temperatureRequirement || "Not specified"}</dd></div>
              </dl>
              <div className="rounded-2xl border border-froto-blue/10 bg-froto-ice p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-froto-navy"><Clock3 className="h-4 w-4 text-froto-blue" />Responses close {formatDateTime(tender.responseClosesAt)}</p>
              </div>
              {tender.notes ? <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Special requirements</p><p className="mt-2 text-sm leading-6 text-slate-700">{tender.notes}</p></div> : null}
              {tender.awardedCompanyName ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 font-semibold text-froto-green"><Trophy className="h-4 w-4" />Awarded to {tender.awardedCompanyName}</p>{tender.awardedAmount !== null ? <p className="mt-1 text-sm text-slate-600">Agreed value {formatAUD(tender.awardedAmount)}</p> : null}</div> : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {tender.canOpenJob && tender.jobId ? (
              <Card className="rounded-[1.6rem] border-froto-green/20 bg-emerald-50/70 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-froto-navy">Awarded work is ready</p>
                      <p className="mt-1 text-sm text-slate-600">Job status: {jobStatusLabel(tender.jobStatus)}. Open the Job to continue the fulfilment workflow.</p>
                    </div>
                    <Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]">
                      <Link href={`/platform/jobs/${tender.jobId}`}>Open Job<ArrowUpRight className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {canRespond ? (
              <Card className="rounded-[1.8rem] border-froto-teal/10 bg-white shadow-lg shadow-froto-navy/5">
                <CardHeader><CardTitle className="flex items-center gap-2 text-xl text-froto-navy"><Send className="h-5 w-5 text-froto-teal" />Submit sealed response</CardTitle><p className="text-sm text-slate-500">Your pricing is visible to the tender owner, not competing suppliers.</p></CardHeader>
                <CardContent>
                  <form onSubmit={submitResponse} className="space-y-4">
                    <label className="space-y-2 text-sm font-medium text-froto-navy">Total quote (AUD)<Input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12500" /></label>
                    <label className="space-y-2 text-sm font-medium text-froto-navy">Service description<textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} className="min-h-24 w-full rounded-md border border-froto-teal/15 bg-white px-3 py-2 text-sm" placeholder="What is included in your offer..." /></label>
                    <label className="space-y-2 text-sm font-medium text-froto-navy">Lead time / service timing<Input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="Pickup within 48 hours" /></label>
                    <label className="space-y-2 text-sm font-medium text-froto-navy">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full rounded-md border border-froto-teal/15 bg-white px-3 py-2 text-sm" /></label>
                    <Button disabled={isSubmitting} className="w-full bg-froto-navy hover:bg-[#0a356f]">{isSubmitting ? "Submitting..." : "Submit Tender Response"}</Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {tender.hasResponded && !tender.isOwner ? <Card className="rounded-[1.6rem] border-froto-teal/10 bg-white"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-semibold text-froto-navy"><CheckCircle2 className="h-4 w-4 text-froto-green" />Your sealed response</p><p className="mt-2 text-sm text-slate-600">Submitted value: {formatAUD(tender.viewerResponseAmount ?? 0)}</p></div>{tender.viewerResponseStatus === "AWARDED" ? <Badge className="bg-froto-green text-white">Winner</Badge> : tender.viewerResponseStatus === "UNSUCCESSFUL" ? <Badge className="bg-slate-500 text-white">Unsuccessful</Badge> : <Badge className="bg-froto-teal text-white">Submitted</Badge>}</div><p className="mt-3 text-xs text-slate-500">Competitor pricing remains sealed.</p></CardContent></Card> : null}

            {tender.isOwner ? <Card className="rounded-[1.8rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
              <CardHeader><CardTitle className="flex items-center gap-2 text-xl text-froto-navy"><ClipboardList className="h-5 w-5 text-froto-blue" />Responses ({tender.responseCount})</CardTitle><p className="text-sm text-slate-500">Visible only to your company as the tender owner.</p></CardHeader>
              <CardContent className="space-y-3">
                {tender.responses.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No supplier responses yet.</p> : tender.responses.map((responseItem) => (
                  <div key={responseItem.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="font-semibold text-froto-navy">{responseItem.companyName}</p><p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(responseItem.createdAt)}</p></div>
                      <div className="text-right"><p className="font-semibold text-froto-blue">{formatAUD(responseItem.amount)}</p><Badge className={responseItem.status === "AWARDED" ? "mt-2 bg-froto-green text-white" : "mt-2 bg-slate-200 text-froto-navy"}>{responseItem.status === "AWARDED" ? "Winner" : responseItem.status === "UNSUCCESSFUL" ? "Unsuccessful" : "Submitted"}</Badge></div>
                    </div>
                    {responseItem.serviceDescription ? <p className="mt-3 text-sm text-slate-600">{responseItem.serviceDescription}</p> : null}
                    {responseItem.leadTime ? <p className="mt-2 text-xs font-medium text-slate-500">Timing: {responseItem.leadTime}</p> : null}
                    {tender.canAward && !tender.awardedResponseId ? <Button className="mt-4 w-full bg-froto-green hover:bg-emerald-700" disabled={awardingId === responseItem.id} onClick={() => void awardResponse(responseItem)}>{awardingId === responseItem.id ? "Awarding..." : "Award this response"}</Button> : null}
                  </div>
                ))}
              </CardContent>
            </Card> : null}

            {actionError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p> : null}
            {actionSuccess ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionSuccess}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
