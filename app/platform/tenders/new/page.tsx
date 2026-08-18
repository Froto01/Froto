"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList } from "lucide-react";
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
  notes: "",
};

const fieldClass =
  "border-froto-blue/15 bg-white focus-visible:border-froto-blue focus-visible:ring-froto-blue/20";

export default function CreateTenderPage() {
  const [form, setForm] = useState<TenderForm>(emptyTender);
  const [submittedTender, setSubmittedTender] = useState<TenderForm | null>(null);

  function updateField(field: keyof TenderForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submitTender(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedTender(form);
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-teal">
                Froto tenders
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">
                Create Tender
              </h1>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="gap-2 border-froto-green/15 bg-white text-froto-navy"
          >
            <Link href="/platform#tenders">
              <ArrowLeft className="h-4 w-4 text-froto-teal" />
              Back to tenders
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-7">
        <div className="mb-6 rounded-[1.5rem] border border-froto-green/10 bg-white/80 p-5 shadow-sm shadow-froto-navy/5">
          <p className="text-sm leading-6 text-slate-600">
            Capture the basics for a product and logistics tender. This flow is still demo-only for now, so submissions remain in the browser until the real tender backend is built.
          </p>
        </div>

        {submittedTender ? (
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/15 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-blue via-froto-teal to-froto-green" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-froto-green ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-froto-navy">Tender created in demo mode</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    No database has been updated yet.
                  </p>
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
                  "Notes / special requirements": submittedTender.notes,
                }).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/65 p-4"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-froto-navy">
                      {value || "Not supplied"}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="bg-froto-navy hover:bg-[#0a356f]">
                  <Link href="/platform#tenders">Return to tenders</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-froto-green/15 text-froto-navy"
                  onClick={() => {
                    setForm(emptyTender);
                    setSubmittedTender(null);
                  }}
                >
                  Create another tender
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/10 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-teal via-froto-cyan to-froto-green" />
            <CardHeader className="border-b border-froto-green/10 bg-emerald-50/35">
              <CardTitle className="text-xl text-froto-navy">Tender details</CardTitle>
              <p className="text-sm text-slate-500">
                Define the product, lane, volume and storage requirements for suppliers to respond to.
              </p>
            </CardHeader>

            <CardContent className="p-6 sm:p-7">
              <form onSubmit={submitTender} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">
                    Tender title
                    <Input
                      required
                      value={form.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      placeholder="FMCG monthly replenishment - East Coast"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">
                    Product / SKU description
                    <Input
                      required
                      value={form.productDescription}
                      onChange={(event) => updateField("productDescription", event.target.value)}
                      placeholder="Cartons of ambient grocery SKUs"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Monthly or one-off volume
                    <Input
                      required
                      value={form.volume}
                      onChange={(event) => updateField("volume", event.target.value)}
                      placeholder="120 pallets per month"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Required delivery date
                    <Input
                      required
                      type="date"
                      value={form.deliveryDate}
                      onChange={(event) => updateField("deliveryDate", event.target.value)}
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Origin
                    <Input
                      required
                      value={form.origin}
                      onChange={(event) => updateField("origin", event.target.value)}
                      placeholder="Sydney, NSW"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Destination
                    <Input
                      required
                      value={form.destination}
                      onChange={(event) => updateField("destination", event.target.value)}
                      placeholder="Brisbane, QLD"
                      className={fieldClass}
                    />
                  </label>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-froto-navy">
                      Storage required
                    </legend>
                    <div className="flex gap-3">
                      {(["Yes", "No"] as const).map((option) => (
                        <label
                          key={option}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                            form.storageRequired === option
                              ? "border-froto-teal/25 bg-teal-50 text-froto-navy"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="storageRequired"
                            checked={form.storageRequired === option}
                            onChange={() => updateField("storageRequired", option)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Temperature requirement
                    <Input
                      value={form.temperatureRequirement}
                      onChange={(event) =>
                        updateField("temperatureRequirement", event.target.value)
                      }
                      placeholder="Ambient, chilled, frozen"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">
                    Notes / special requirements
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Delivery windows, handling notes, insurance requirements..."
                      className="min-h-28 w-full rounded-md border border-froto-green/15 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-froto-teal focus-visible:ring-[3px] focus-visible:ring-froto-teal/20"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2 border-t border-froto-green/10 pt-5 sm:flex-row">
                  <Button type="submit" className="bg-froto-navy hover:bg-[#0a356f]">
                    Create Tender
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="border-froto-green/15 text-froto-navy"
                  >
                    <Link href="/platform#tenders">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
