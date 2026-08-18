"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createListing } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ListingType = "Transport Lane" | "Warehouse Space";

type CreateListingForm = {
  listingType: ListingType;
  title: string;
  location: string;
  origin: string;
  destination: string;
  capacityAmount: string;
  capacityUnit: "pallets" | "parcels" | "sqm" | "cbm";
  temperatureClass:
    | "ambient"
    | "chilled"
    | "frozen"
    | "dangerous goods"
    | "other";
  availableFrom: string;
  availableTo: string;
  startingBid: string;
  minimumBidIncrement: string;
  notes: string;
};

const emptyListing: CreateListingForm = {
  listingType: "Transport Lane",
  title: "",
  location: "",
  origin: "",
  destination: "",
  capacityAmount: "",
  capacityUnit: "pallets",
  temperatureClass: "ambient",
  availableFrom: "",
  availableTo: "",
  startingBid: "",
  minimumBidIncrement: "",
  notes: "",
};

export default function CreateListingPage() {
  const [form, setForm] = useState<CreateListingForm>(emptyListing);
  const [submittedListing, setSubmittedListing] =
    useState<CreateListingForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof CreateListingForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await createListing(form);
      setSubmittedListing(form);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Froto could not save this listing. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const isTransportLane = form.listingType === "Transport Lane";

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
              Create listing
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
              List spare capacity
            </h1>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/platform">
              <ArrowLeft className="h-4 w-4" />
              Back to platform
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {submittedListing ? (
          <Card className="rounded-3xl border-emerald-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </span>
                <div>
                  <CardTitle>Listing created</CardTitle>
                  <p className="mt-1 text-sm text-neutral-500">
                    This capacity is now stored in Froto and available to the marketplace.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries({
                  "Listing type": submittedListing.listingType,
                  "Listing title": submittedListing.title,
                  Location:
                    submittedListing.listingType === "Warehouse Space"
                      ? submittedListing.location
                      : `${submittedListing.origin} to ${submittedListing.destination}`,
                  Capacity: `${submittedListing.capacityAmount} ${submittedListing.capacityUnit}`,
                  "Temperature class": submittedListing.temperatureClass,
                  "Available from": submittedListing.availableFrom,
                  "Available to": submittedListing.availableTo,
                  "Starting bid": submittedListing.startingBid,
                  "Minimum bid increment":
                    submittedListing.minimumBidIncrement,
                  Notes: submittedListing.notes,
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
                  <Link href="/platform">View marketplace</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(emptyListing);
                    setSubmittedListing(null);
                    setError(null);
                  }}
                >
                  Create another listing
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Listing details</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={submitListing} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Listing type
                    <select
                      value={form.listingType}
                      onChange={(event) =>
                        updateField("listingType", event.target.value)
                      }
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="Transport Lane">Transport Lane</option>
                      <option value="Warehouse Space">Warehouse Space</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Listing title
                    <Input
                      required
                      value={form.title}
                      onChange={(event) =>
                        updateField("title", event.target.value)
                      }
                      placeholder="MEL to BNE linehaul capacity"
                    />
                  </label>

                  {isTransportLane ? (
                    <>
                      <label className="space-y-2 text-sm font-medium text-neutral-700">
                        Origin
                        <Input
                          required
                          value={form.origin}
                          onChange={(event) =>
                            updateField("origin", event.target.value)
                          }
                          placeholder="Melbourne, VIC"
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
                    </>
                  ) : (
                    <label className="space-y-2 text-sm font-medium text-neutral-700 sm:col-span-2">
                      Location
                      <Input
                        required
                        value={form.location}
                        onChange={(event) =>
                          updateField("location", event.target.value)
                        }
                        placeholder="Sydney, NSW"
                      />
                    </label>
                  )}

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Capacity amount
                    <Input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={form.capacityAmount}
                      onChange={(event) =>
                        updateField("capacityAmount", event.target.value)
                      }
                      placeholder="22"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Capacity unit
                    <select
                      value={form.capacityUnit}
                      onChange={(event) =>
                        updateField("capacityUnit", event.target.value)
                      }
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="pallets">pallets</option>
                      <option value="parcels">parcels</option>
                      <option value="sqm">sqm</option>
                      <option value="cbm">cbm</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Temperature class
                    <select
                      value={form.temperatureClass}
                      onChange={(event) =>
                        updateField("temperatureClass", event.target.value)
                      }
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="ambient">ambient</option>
                      <option value="chilled">chilled</option>
                      <option value="frozen">frozen</option>
                      <option value="dangerous goods">dangerous goods</option>
                      <option value="other">other</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Available from date
                    <Input
                      required
                      type="date"
                      value={form.availableFrom}
                      onChange={(event) =>
                        updateField("availableFrom", event.target.value)
                      }
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Available to date
                    <Input
                      required
                      type="date"
                      value={form.availableTo}
                      onChange={(event) =>
                        updateField("availableTo", event.target.value)
                      }
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Starting bid
                    <Input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.startingBid}
                      onChange={(event) =>
                        updateField("startingBid", event.target.value)
                      }
                      placeholder="95"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Minimum bid increment
                    <Input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.minimumBidIncrement}
                      onChange={(event) =>
                        updateField("minimumBidIncrement", event.target.value)
                      }
                      placeholder="10"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700 sm:col-span-2">
                    Notes
                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                      placeholder="Operating windows, dock requirements, handling notes..."
                      className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </label>
                </div>

                {error ? (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Creating listing..." : "Create Listing"}
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/platform">Cancel</Link>
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
