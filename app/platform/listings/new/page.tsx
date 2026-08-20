"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, PackagePlus, Truck, Warehouse } from "lucide-react";
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
  biddingClosesAt: string;
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
  biddingClosesAt: "",
  notes: "",
};

function displayCloseTime(value: string) {
  if (!value) {
    return "Not supplied";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const fieldClass =
  "border-froto-blue/15 bg-white focus-visible:border-froto-blue focus-visible:ring-froto-blue/20";
const selectClass =
  "h-9 w-full rounded-md border border-froto-blue/15 bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-froto-blue focus-visible:ring-[3px] focus-visible:ring-froto-blue/20";

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
      const localCloseTime = new Date(form.biddingClosesAt);

      if (Number.isNaN(localCloseTime.getTime())) {
        throw new Error("Please provide a valid bidding close time.");
      }

      await createListing({
        ...form,
        biddingClosesAt: localCloseTime.toISOString(),
      });
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
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-froto-blue to-froto-teal text-white shadow-md shadow-froto-blue/15">
              <PackagePlus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">
                Create listing
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">
                List spare capacity
              </h1>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="gap-2 border-froto-blue/15 bg-white text-froto-navy"
          >
            <Link href="/platform">
              <ArrowLeft className="h-4 w-4 text-froto-blue" />
              Back to marketplace
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-7">
        {submittedListing ? (
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/15 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-blue via-froto-teal to-froto-green" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-froto-green ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-froto-navy">Listing created</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    This capacity is now stored in Froto and available to the marketplace.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
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
                  "Minimum bid increment": submittedListing.minimumBidIncrement,
                  "Bidding closes": displayCloseTime(submittedListing.biddingClosesAt),
                  Notes: submittedListing.notes,
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
                  <Link href="/platform">View marketplace</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-froto-teal/15 text-froto-navy"
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
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-blue via-froto-cyan to-froto-green" />
            <CardHeader className="border-b border-froto-blue/10 bg-froto-ice/55">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-froto-navy">Listing details</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Publish transport or warehouse capacity for companies to discover and bid on.
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-froto-blue ring-1 ring-froto-blue/10">
                  {isTransportLane ? <Truck className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-7">
              <form onSubmit={submitListing} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Listing type
                    <select
                      value={form.listingType}
                      onChange={(event) => updateField("listingType", event.target.value)}
                      className={selectClass}
                    >
                      <option value="Transport Lane">Transport Lane</option>
                      <option value="Warehouse Space">Warehouse Space</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Listing title
                    <Input
                      required
                      value={form.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      placeholder="MEL to BNE linehaul capacity"
                      className={fieldClass}
                    />
                  </label>

                  {isTransportLane ? (
                    <>
                      <label className="space-y-2 text-sm font-medium text-froto-navy">
                        Origin
                        <Input
                          required
                          value={form.origin}
                          onChange={(event) => updateField("origin", event.target.value)}
                          placeholder="Melbourne, VIC"
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
                    </>
                  ) : (
                    <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">
                      Location
                      <Input
                        required
                        value={form.location}
                        onChange={(event) => updateField("location", event.target.value)}
                        placeholder="Sydney, NSW"
                        className={fieldClass}
                      />
                    </label>
                  )}

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Capacity amount
                    <Input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={form.capacityAmount}
                      onChange={(event) => updateField("capacityAmount", event.target.value)}
                      placeholder="22"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Capacity unit
                    <select
                      value={form.capacityUnit}
                      onChange={(event) => updateField("capacityUnit", event.target.value)}
                      className={selectClass}
                    >
                      <option value="pallets">pallets</option>
                      <option value="parcels">parcels</option>
                      <option value="sqm">sqm</option>
                      <option value="cbm">cbm</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Temperature class
                    <select
                      value={form.temperatureClass}
                      onChange={(event) => updateField("temperatureClass", event.target.value)}
                      className={selectClass}
                    >
                      <option value="ambient">ambient</option>
                      <option value="chilled">chilled</option>
                      <option value="frozen">frozen</option>
                      <option value="dangerous goods">dangerous goods</option>
                      <option value="other">other</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Available from date
                    <Input
                      required
                      type="date"
                      value={form.availableFrom}
                      onChange={(event) => updateField("availableFrom", event.target.value)}
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Available to date
                    <Input
                      required
                      type="date"
                      value={form.availableTo}
                      onChange={(event) => updateField("availableTo", event.target.value)}
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Starting bid
                    <Input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.startingBid}
                      onChange={(event) => updateField("startingBid", event.target.value)}
                      placeholder="95"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Minimum bid increment
                    <Input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.minimumBidIncrement}
                      onChange={(event) => updateField("minimumBidIncrement", event.target.value)}
                      placeholder="10"
                      className={fieldClass}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">
                    Bidding closes
                    <Input
                      required
                      type="datetime-local"
                      value={form.biddingClosesAt}
                      onChange={(event) => updateField("biddingClosesAt", event.target.value)}
                      className={fieldClass}
                    />
                    <span className="flex items-center gap-1.5 text-xs font-normal text-slate-500">
                      <Clock3 className="h-3.5 w-3.5 text-froto-teal" />
                      Froto will stop accepting bids automatically at this time.
                    </span>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">
                    Notes
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Operating windows, dock requirements, handling notes..."
                      className="min-h-28 w-full rounded-md border border-froto-blue/15 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-froto-blue focus-visible:ring-[3px] focus-visible:ring-froto-blue/20"
                    />
                  </label>
                </div>

                {error ? (
                  <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-froto-blue/10 pt-5 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-froto-navy hover:bg-[#0a356f]"
                  >
                    {isSaving ? "Creating listing..." : "Create Listing"}
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="border-froto-blue/15 text-froto-navy"
                  >
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
