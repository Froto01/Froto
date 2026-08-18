"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LiveBid = {
  id: string;
  amount: number;
  createdAt: string;
  bidderCompanyName: string;
  bidderCompanyVerified: boolean;
};

type DatabaseListing = {
  id: string;
  listingType: string;
  title: string;
  location: string | null;
  origin: string | null;
  destination: string | null;
  capacityAmount: number;
  capacityUnit: string;
  temperatureClass: string;
  availableFrom: string;
  availableTo: string;
  startingBid: number;
  minimumBidIncrement: number;
  currentBid: number;
  minimumNextBid: number;
  bidCount: number;
  bids: LiveBid[];
  notes: string | null;
  status: string;
  companyName: string;
  companyVerified: boolean;
  createdAt: string;
};

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatBidTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function listingImage(listingType: string) {
  return listingType === "Warehouse Space"
    ? "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80";
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<DatabaseListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  const loadListing = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/listings/${params.id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Listing not found");
      }

      const data = (await response.json()) as DatabaseListing;
      setListing(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Listing not found");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  async function submitBid() {
    if (!listing) {
      return;
    }

    const amount = Number(bidAmount);

    if (!Number.isFinite(amount) || amount < listing.minimumNextBid) {
      setBidError(`Minimum next bid is ${formatAUD(listing.minimumNextBid)}.`);
      setBidSuccess(null);
      return;
    }

    setIsSubmittingBid(true);
    setBidError(null);
    setBidSuccess(null);

    try {
      const response = await fetch(`/api/listings/${listing.id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = (await response.json()) as {
        error?: string;
        currentBid?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "The bid could not be placed.");
      }

      setBidAmount("");
      setBidSuccess(
        `Bid placed at ${formatAUD(data.currentBid ?? amount)} and saved to Froto.`
      );
      await loadListing();
    } catch (error) {
      setBidError(
        error instanceof Error ? error.message : "The bid could not be placed."
      );
    } finally {
      setIsSubmittingBid(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <Card className="rounded-2xl p-6 text-sm text-neutral-500 shadow-sm">
            Loading listing...
          </Card>
        </div>
      </main>
    );
  }

  if (!listing || loadError) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <Button asChild variant="outline" className="mb-6 gap-2">
            <Link href="/platform">
              <ArrowLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
          </Button>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Listing not found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              This listing is not available in the marketplace.
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const location =
    listing.listingType === "Transport Lane"
      ? `${listing.origin ?? "Origin"} to ${listing.destination ?? "Destination"}`
      : listing.location ?? "Location not supplied";

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Button asChild variant="outline" className="mb-6 gap-2">
          <Link href="/platform">
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden rounded-3xl shadow-sm">
              <div className="relative">
                <Image
                  src={listingImage(listing.listingType)}
                  alt={listing.title}
                  width={1200}
                  height={800}
                  priority
                  className="h-72 w-full object-cover sm:h-96"
                />
                <Badge className="absolute left-4 top-4 bg-white/90 text-black border">
                  {listing.listingType}
                </Badge>
              </div>

              <CardHeader>
                <CardTitle className="text-2xl">{listing.title}</CardTitle>
                <p className="text-sm text-neutral-500">{location}</p>
                <p className="text-sm text-neutral-500">
                  Listed by {listing.companyName}
                  {listing.companyVerified ? " · Verified" : ""}
                </p>
              </CardHeader>

              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Capacity
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {listing.capacityAmount} {listing.capacityUnit}
                    </dd>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Starting bid
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {formatAUD(listing.startingBid)}
                    </dd>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Temperature class
                    </dt>
                    <dd className="mt-1 font-medium capitalize text-neutral-900">
                      {listing.temperatureClass}
                    </dd>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Availability
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {formatDate(listing.availableFrom)} to {formatDate(listing.availableTo)}
                    </dd>
                  </div>
                </dl>

                {listing.notes ? (
                  <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">{listing.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-3xl border-sky-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Live bid room</CardTitle>
                <p className="text-sm text-neutral-500">
                  Bids are authenticated, tied to your Froto company, and saved to the marketplace.
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">
                    Current bid
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-neutral-900">
                    {formatAUD(listing.currentBid)}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Minimum next bid: {formatAUD(listing.minimumNextBid)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {listing.bidCount === 0
                      ? "No bids placed yet"
                      : `${listing.bidCount} ${listing.bidCount === 1 ? "bid" : "bids"} placed`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={listing.minimumNextBid}
                    step="0.01"
                    value={bidAmount}
                    onChange={(event) => setBidAmount(event.target.value)}
                    placeholder={`Enter ${listing.minimumNextBid} or higher`}
                    disabled={isSubmittingBid || listing.status !== "ACTIVE"}
                  />
                  <Button
                    onClick={submitBid}
                    disabled={isSubmittingBid || listing.status !== "ACTIVE"}
                  >
                    {isSubmittingBid ? "Placing..." : "Place bid"}
                  </Button>
                </div>

                {bidError ? (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {bidError}
                  </p>
                ) : null}

                {bidSuccess ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    {bidSuccess}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    Bid history
                  </p>

                  {listing.bids.length === 0 ? (
                    <p className="rounded-xl border bg-white px-3 py-3 text-sm text-neutral-500">
                      No bids yet. The next valid bid will become the first live market bid.
                    </p>
                  ) : (
                    listing.bids.map((bid) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {bid.bidderCompanyName}
                            {bid.bidderCompanyVerified ? " · Verified" : ""}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatBidTime(bid.createdAt)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatAUD(bid.amount)}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
