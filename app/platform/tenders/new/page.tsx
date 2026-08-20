"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TenderForm = {
  title: string;
  productDescription: string;
  volume: string;
  origin: string;
  destination: string;
  storageRequired: "Yes" | "No";
  temperatureRequirement: string;
  deliveryDate: string;
  responseClosesAt: string;
  notes: string;
};

const emptyTender: TenderForm = {
  title: "",
  productDescription: "",
  volume: "",
  origin: "",
  destination: "",
  storageRequired: "No",
  temperatureRequirement: "",
  deliveryDate: "",
  responseClosesAt: "",
  notes: "",
};

const fieldClass =
  "border-froto-blue/15 bg-white focus-visible:border-froto-blue focus-visible:ring-froto-blue/20";

function displayDateTime(value: string) {
  if (!value) return "Not supplied";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function CreateTenderPage() {
  const [form, setForm] = useState<TenderForm>(emptyTender);
  const [submittedTender, setSubmittedTender] = useState<TenderForm | null>(null);
  const [createdTenderId, setCreatedTenderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof TenderForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitTender(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const closeTime = new Date(form.responseClosesAt);
      if (Number.isNaN(closeTime.getTime())) {
        throw new Error("Please provide a valid response close time.");
      }

      const response = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          productDescription: form.productDescription,
          volume: form.volume,
          origin: form.origin,
          destination: form.destination,
          storageRequired: form.storageRequired === "Yes",
          temperatureRequirement: form.temperatureRequirement,
          deliveryDate: form.deliveryDate,
          responseClosesAt: closeTime.toISOString(),
          notes: form.notes,
        }),
      });

      const data = (await response.json()) as { error?: string; tenderId?: string };
      if (!response.ok || !data.tenderId) {
        throw new Error(data.error ?? "Froto could not create this tender.");
      }

      setCreatedTenderId(data.tenderId);
      setSubmittedTender(form);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Froto could not create this tender. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-green/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-froto-teal to-froto-green text-white shadow-md shadow-froto-teal/15">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-teal">Froto tenders</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">Create Tender</h1>
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2 border-froto-green/15 bg-white text-froto-navy">
            <Link href="/platform#tenders"><ArrowLeft className="h-4 w-4 text-froto-teal" />Back to tenders</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-7">
        <div className="mb-6 rounded-[1.5rem] border border-froto-green/10 bg-white/80 p-5 shadow-sm shadow-froto-navy/5">
          <p className="text-sm leading-6 text-slate-600">
            Create a live procurement request for other Froto companies to respond to. Responses close automatically at the time you choose, then your company can select the winning supplier.
          </p>
        </div>

        {submittedTender && createdTenderId ? (
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/15 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-blue via-froto-teal to-froto-green" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-froto-green ring-1 ring-emerald-100"><CheckCircle2 className="h-5 w-5" /></span>
                <div>
                  <CardTitle className="text-froto-navy">Tender published</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">This tender is stored in Froto and is now available for supplier responses.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries({
                  "Tender title": submittedTender.title,
                  "Product / SKU description": submittedTender.productDescription,
                  "Monthly or one-off volume": submittedTender.volume,
                  Origin: submittedTender.origin,
                  Destination: submittedTender.destination,
                  "Storage required": submittedTender.storageRequired,
                  "Temperature requirement": submittedTender.temperatureRequirement,
                  "Required delivery date": submittedTender.deliveryDate,
                  "Responses close": displayDateTime(submittedTender.responseClosesAt),
                  "Notes / special requirements": submittedTender.notes,
                }).map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200/80 bg-slate-50/65 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-froto-navy">{value || "Not supplied"}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="bg-froto-navy hover:bg-[#0a356f]"><Link href={`/platform/tenders/${createdTenderId}`}>View tender</Link></Button>
                <Button type="button" variant="outline" className="border-froto-green/15 text-froto-navy" onClick={() => {
                  setForm(emptyTender);
                  setSubmittedTender(null);
                  setCreatedTenderId(null);
                  setError(null);
                }}>Create another tender</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/10 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-teal via-froto-cyan to-froto-green" />
            <CardHeader className="border-b border-froto-green/10 bg-emerald-50/35">
              <CardTitle className="text-xl text-froto-navy">Tender details</CardTitle>
              <p className="text-sm text-slate-500">Define the requirement and how long suppliers have to respond.</p>
            </CardHeader>
            <CardContent className="p-6 sm:p-7">
              <form onSubmit={submitTender} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Tender title<Input required value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="FMCG monthly replenishment - East Coast" className={fieldClass} /></label>
                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Product / SKU description<Input required value={form.productDescription} onChange={(e) => updateField("productDescription", e.target.value)} placeholder="Cartons of ambient grocery SKUs" className={fieldClass} /></label>
                  <label className="space-y-2 text-sm font-medium text-froto-navy">Monthly or one-off volume<Input required value={form.volume} onChange={(e) => updateField("volume", e.target.value)} placeholder="120 pallets per month" className={fieldClass} /></label>
                  <label className="space-y-2 text-sm font-medium text-froto-navy">Required delivery date<Input required type="date" value={form.deliveryDate} onChange={(e) => updateField("deliveryDate", e.target.value)} className={fieldClass} /></label>
                  <label className="space-y-2 text-sm font-medium text-froto-navy">Origin<Input required value={form.origin} onChange={(e) => updateField("origin", e.target.value)} placeholder="Sydney, NSW" className={fieldClass} /></label>
                  <label className="space-y-2 text-sm font-medium text-froto-navy">Destination<Input required value={form.destination} onChange={(e) => updateField("destination", e.target.value)} placeholder="Brisbane, QLD" className={fieldClass} /></label>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-froto-navy">Storage required</legend>
                    <div className="flex gap-3">
                      {(["Yes", "No"] as const).map((option) => (
                        <label key={option} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${form.storageRequired === option ? "border-froto-teal/25 bg-teal-50 text-froto-navy" : "border-slate-200 bg-white text-slate-600"}`}>
                          <input type="radio" name="storageRequired" checked={form.storageRequired === option} onChange={() => updateField("storageRequired", option)} />{option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="space-y-2 text-sm font-medium text-froto-navy">Temperature requirement<Input value={form.temperatureRequirement} onChange={(e) => updateField("temperatureRequirement", e.target.value)} placeholder="Ambient, chilled, frozen" className={fieldClass} /></label>
                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Response close time<div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-froto-teal" /><Input required type="datetime-local" value={form.responseClosesAt} onChange={(e) => updateField("responseClosesAt", e.target.value)} className={`${fieldClass} pl-9`} /></div></label>
                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Notes / special requirements<textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Delivery windows, handling notes, insurance requirements..." className="min-h-28 w-full rounded-md border border-froto-green/15 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-froto-teal focus-visible:ring-[3px] focus-visible:ring-froto-teal/20" /></label>
                </div>
                {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
                <div className="flex flex-col gap-2 border-t border-froto-green/10 pt-5 sm:flex-row">
                  <Button type="submit" disabled={isSaving} className="bg-froto-navy hover:bg-[#0a356f]">{isSaving ? "Publishing..." : "Publish Tender"}</Button>
                  <Button asChild type="button" variant="outline" className="border-froto-green/15 text-froto-navy"><Link href="/platform#tenders">Cancel</Link></Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
