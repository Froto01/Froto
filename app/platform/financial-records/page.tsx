"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileText, ReceiptText, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FinancialRecord = {
  id: string;
  source: {
    type: "MARKETPLACE" | "TENDER" | "GUEST_JOB" | "TRANSACTION";
    title: string;
    href: string | null;
  };
  viewerSide: "BUYER" | "PROVIDER";
  counterpartyName: string;
  grossAmountMinor: string;
  currency: string;
  paymentMode: string;
  paymentStatus: string;
  settlementStatus: string;
  paymentTerms: string | null;
  awardedAt: string;
  chargeTotalMinor: string;
  paidTotalMinor: string;
  adjustmentTotalMinor: string;
  invoiceCount: number;
  latestInvoice: null | {
    invoiceType: string;
    invoiceNumber: string | null;
    status: string;
    totalMinor: string;
    currency: string;
    issuedAt: string | null;
    dueAt: string | null;
  };
};

function moneyFromMinor(value: string, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function humanise(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function FinancialRecordsPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/commercial-transactions", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as FinancialRecord[] | { error?: string };
        if (!response.ok) {
          throw new Error("error" in data ? data.error ?? "Financial records could not be loaded." : "Financial records could not be loaded.");
        }
        return data as FinancialRecord[];
      })
      .then((data) => {
        if (!cancelled) {
          setRecords(data);
          setError(null);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : "Financial records could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(
    () =>
      records.reduce(
        (summary, record) => ({
          grossMinor: summary.grossMinor + BigInt(record.grossAmountMinor),
          chargesMinor: summary.chargesMinor + BigInt(record.chargeTotalMinor),
        }),
        { grossMinor: BigInt(0), chargesMinor: BigInt(0) }
      ),
    [records]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Button asChild variant="outline" className="mb-6 gap-2 border-froto-blue/15 bg-white text-froto-navy">
          <Link href="/platform/dashboard">
            <ArrowLeft className="h-4 w-4 text-froto-blue" />
            Back to dashboard
          </Link>
        </Button>

        <section className="overflow-hidden rounded-[2rem] border border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
          <div className="bg-gradient-to-r from-froto-navy via-[#0a4778] to-froto-teal px-6 py-8 text-white sm:px-8">
            <div className="flex items-center gap-2 text-cyan-100">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Private commercial records</p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Financial records</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 sm:text-base">
              View the commercial records attached to awarded Froto work. Payment provider, GST treatment and invoice issuing remain inactive until separately approved.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8">
            <div className="mb-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-froto-ice p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-blue">Transactions</p>
                <p className="mt-2 text-2xl font-semibold text-froto-navy">{records.length}</p>
                <p className="mt-1 text-sm text-slate-500">Awarded jobs attached to your company.</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-teal">Gross awarded value</p>
                <p className="mt-2 text-2xl font-semibold text-froto-navy">{moneyFromMinor(totals.grossMinor.toString())}</p>
                <p className="mt-1 text-sm text-slate-500">Commercial value recorded through Froto.</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Froto charges</p>
                <p className="mt-2 text-2xl font-semibold text-froto-navy">{moneyFromMinor(totals.chargesMinor.toString())}</p>
                <p className="mt-1 text-sm text-slate-500">No success fee is activated unless a charge record exists.</p>
              </div>
            </div>

            {loading ? (
              <Card className="rounded-[1.5rem] border-froto-blue/10 bg-slate-50 p-6 text-sm text-slate-500">Loading financial records...</Card>
            ) : error ? (
              <Card className="rounded-[1.5rem] border-red-100 bg-red-50 p-6 text-sm text-red-700">{error}</Card>
            ) : records.length === 0 ? (
              <Card className="rounded-[1.5rem] border-froto-blue/10 bg-slate-50 p-8 text-center">
                <CardTitle className="text-lg text-froto-navy">No commercial records yet</CardTitle>
                <p className="mt-2 text-sm text-slate-500">Awarded marketplace work will appear here automatically.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <Card key={record.id} className="rounded-[1.5rem] border-froto-blue/10 bg-white shadow-sm shadow-froto-navy/5">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-xl text-froto-navy">{record.source.title}</CardTitle>
                            <Badge className="border border-froto-blue/15 bg-blue-50 text-froto-blue">{record.viewerSide === "BUYER" ? "Buyer" : "Provider"}</Badge>
                            <Badge variant="outline">{humanise(record.source.type)}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">Counterparty: {record.counterpartyName} · Awarded {formatDate(record.awardedAt)}</p>
                        </div>
                        {record.source.href ? (
                          <Button asChild variant="outline" className="gap-1 border-froto-blue/15 text-froto-navy">
                            <Link href={record.source.href}>Open job <ArrowUpRight className="h-4 w-4" /></Link>
                          </Button>
                        ) : null}
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-froto-ice p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contract value</p>
                          <p className="mt-1 font-semibold text-froto-navy">{moneyFromMinor(record.grossAmountMinor, record.currency)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Payment</p>
                          <p className="mt-1 font-semibold text-froto-navy">{humanise(record.paymentStatus)}</p>
                          <p className="mt-1 text-xs text-slate-500">{humanise(record.paymentMode)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Settlement</p>
                          <p className="mt-1 font-semibold text-froto-navy">{humanise(record.settlementStatus)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Froto charges</p>
                          <p className="mt-1 font-semibold text-froto-navy">{moneyFromMinor(record.chargeTotalMinor, record.currency)}</p>
                          <p className="mt-1 text-xs text-slate-500">Policy remains inactive unless recorded.</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <ReceiptText className="mt-0.5 h-5 w-5 text-froto-teal" />
                          <div>
                            <p className="font-semibold text-froto-navy">Invoice record</p>
                            {record.latestInvoice ? (
                              <p className="mt-1 text-sm text-slate-500">
                                {record.latestInvoice.invoiceNumber ?? "Draft / unnumbered"} · {humanise(record.latestInvoice.status)} · {moneyFromMinor(record.latestInvoice.totalMinor, record.latestInvoice.currency)}
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-slate-500">No invoice has been issued or drafted for this transaction.</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <FileText className="mt-0.5 h-5 w-5 text-froto-blue" />
                          <div>
                            <p className="font-semibold text-froto-navy">Payment terms</p>
                            <p className="mt-1 text-sm text-slate-500">{record.paymentTerms ?? "Not set"}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </section>
      </div>
    </main>
  );
}
