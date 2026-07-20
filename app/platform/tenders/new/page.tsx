"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
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

export default function CreateTenderPage() {
  const [form, setForm] = useState<TenderForm>(emptyTender);
  const [submittedTender, setSubmittedTender] = useState<TenderForm | null>(
    null
  );

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
    <main className="min-h-screen bg-neutral-50 pb-16">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Button asChild variant="outline" className="mb-6 gap-2">
          <Link href="/platform#tenders">
            <ArrowLeft className="h-4 w-4" />
            Back to tenders
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Create Tender
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Capture the basics for a product and logistics tender. This demo
            keeps everything in the browser.
          </p>
        </div>

        {submittedTender ? (
          <Card className="rounded-3xl border-emerald-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </span>
                <div>
                  <CardTitle>Tender created in demo mode</CardTitle>
                  <p className="mt-1 text-sm text-neutral-500">
                    No database has been updated yet.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries({
                  "Tender title": submittedTender.title,
                  "Product / SKU description":
                    submittedTender.productDescription,
                  "Monthly or one-off volume": submittedTender.volume,
                  Origin: submittedTender.origin,
                  Destination: submittedTender.destination,
                  "Storage required": submittedTender.storageRequired,
                  "Temperature requirement":
                    submittedTender.temperatureRequirement,
                  "Required delivery date": submittedTender.deliveryDate,
                  "Notes / special requirements": submittedTender.notes,
                }).map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-neutral-900">
                      {value || "Not supplied"}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/platform#tenders">Return to tenders</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
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
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Tender details</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={submitTender} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-neutral-700 sm:col-span-2">
                    Tender title
                    <Input
                      required
                      value={form.title}
                      onChange={(event) =>
                        updateField("title", event.target.value)
                      }
                      placeholder="FMCG monthly replenishment - East Coast"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700 sm:col-span-2">
                    Product / SKU description
                    <Input
                      required
                      value={form.productDescription}
                      onChange={(event) =>
                        updateField("productDescription", event.target.value)
                      }
                      placeholder="Cartons of ambient grocery SKUs"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Monthly or one-off volume
                    <Input
                      required
                      value={form.volume}
                      onChange={(event) =>
                        updateField("volume", event.target.value)
                      }
                      placeholder="120 pallets per month"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Required delivery date
                    <Input
                      required
                      type="date"
                      value={form.deliveryDate}
                      onChange={(event) =>
                        updateField("deliveryDate", event.target.value)
                      }
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Origin
                    <Input
                      required
                      value={form.origin}
                      onChange={(event) =>
                        updateField("origin", event.target.value)
                      }
                      placeholder="Sydney, NSW"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Destination
                    <Input
                      required
                      value={form.destination}
                      onChange={(event) =>
                        updateField("destination", event.target.value)
                      }
                      placeholder="Brisbane, QLD"
                    />
                  </label>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-neutral-700">
                      Storage required
                    </legend>
                    <div className="flex gap-3">
                      {(["Yes", "No"] as const).map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"
                        >
                          <input
                            type="radio"
                            name="storageRequired"
                            checked={form.storageRequired === option}
                            onChange={() =>
                              updateField("storageRequired", option)
                            }
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Temperature requirement
                    <Input
                      value={form.temperatureRequirement}
                      onChange={(event) =>
                        updateField(
                          "temperatureRequirement",
                          event.target.value
                        )
                      }
                      placeholder="Ambient, chilled, frozen"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700 sm:col-span-2">
                    Notes / special requirements
                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                      placeholder="Delivery windows, handling notes, insurance requirements..."
                      className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit">Create Tender</Button>
                  <Button asChild type="button" variant="outline">
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
