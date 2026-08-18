"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEMO_BIDS, LOGISTICS_LISTINGS } from "@/lib/mock-data";

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
  notes: string | null;
  status: string;
  companyName: string;
  companyVerified: boolean;
  createdAt: string;
};

type ListingView = {
  id: string;
  title: string;
  listingType: string;
  location: string;
  capacity: string;
  temperatureClass?: string;
  availableFrom?: string;
  availableTo?: string;
  startingBid: number;
  minimumBidIncrement: number;
  notes?: string | null;
  companyName?: string;
  image: string;
  isDemo: boolean;
};

function formatAUD(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(v);
}

function formatDate(value?: string) {
  if (!value) {
    return "Not supplied";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function databaseListingImage(listingType: string) {
  return listingType === "Warehouse Space"
    ? "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80";
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const demoListing = LOGISTICS_LISTINGS.find((item) => item.id === params.id);
  const [databaseListing, setDatabaseListing] =
    useState<DatabaseListing | null>(null);
  const [isLoading, setIsLoading] = useState(!demoListing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [demoBids, setDemoBids] = useState(DEMO_BIDS);

  useEffect(() => {
    if (demoListing) {
      setDatabaseListing(null);
      setDemoBids(DEMO_BIDS);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setDemoBids([]);

    async function loadListing() {
      try {
        const response = await fetch(`/api/listings/${params.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Listing not found");
        }

        const data = (await response.json()) as DatabaseListing;

        if (!cancelled) {
          setDatabaseListing(data);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Listing not found"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadListing();

    return () => {
      cancelled = true;
    };
  }, [demoListing, params.id]);

  const listing = useMemo<ListingView | null>(() => {
    if (demoListing) {
      return {
        id: demoListing.id,
        title: demoListing.name,
        listingType: demoListing.type,
        location: demoListing.location,
        capacity: demoListing.capacity,
        startingBid: demoListing.currentBid,
        minimumBidIncrement: 10,
        image: demoListing.image,
        isDemo: true,
      };
    }

    if (!databaseListing) {
      return null;
    }

    const location =
      databaseListing.listingType === "Transport Lane"
        ? `${databaseListing.origin ?? "Origin"} to ${
            databaseListing.destination ?? "Destination"
          }`
        : databaseListing.location ?? "Location not supplied";

    return {
      id: databaseListing.id,
      title: databaseListing.title,
      listingType: databaseListing.listingType,
      location,
      capacity: `${databaseListing.capacityAmount} ${databaseListing.capacityUnit}`,
      temperatureClass: databaseListing.temperatureClass,
      availableFrom: databaseListing.availableFrom,
      availableTo: databaseListing.availableTo,
      startingBid: databaseListing.startingBid,
      minimumBidIncrement: databaseListing.minimumBidIncrement,
      notes: databaseListing.notes,
      companyName: databaseListing.companyName,
      image: databaseListingImage(databaseListing.listingType),
      isDemo: false,
    };
  }, [databaseListing, demoListing]);

  const highestBid = useMemo(() => {
    if (!listing) {
      return 0;
    }

    return Math.max(
      listing.startingBid,
      ...demoBids.map((bid) => bid.amount)
    );
  }, [demoBids, listing]);

  const minimumBid = listing
    ? highestBid + listing.minimumBidIncrement
    : highestBid + 10;

  function submitDemoBid() {
    const amount = Number(bidAmount);

    if (!amount || amount < minimumBid) {
      alert(`Minimum bid is ${formatAUD(minimumBid)}`);
      return;
    }

    setDemoBids([{ bidder: "You", amount, time: "Just now" }, ...demoBids]);
    setBidAmount("");
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
              Back to platform
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

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Button asChild variant="outline" className="mb-6 gap-2">
          <Link href="/platform">
            <ArrowLeft className="h-4 w-4" />
            Back to platform
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden rounded-3xl shadow-sm">
              <div className="relative">
                <Image
                  src={listing.image}
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
                <p className="text-sm text-neutral-500">{listing.location}</p>
                {listing.companyName ? (
                  <p className="text-sm text-neutral-500">
                    Listed by {listing.companyName}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Capacity
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {listing.capacity}
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
                      Type
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {listing.listingType}
                    </dd>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Location
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {listing.location}
                    </dd>
                  </div>

                  {!listing.isDemo ? (
                    <>
                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Temperature class
                        </dt>
                        <dd className="mt-1 font-medium text-neutral-900">
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
                    </>
                  ) : null}
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
                <CardTitle className="text-lg">Bid room</CardTitle>
                <p className="text-sm text-neutral-500">
                  Listing data is live. Bids on this screen are still temporary until the bidding layer is connected next.
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">
                    Current bid
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-neutral-900">
                    {formatAUD(highestBid)}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Minimum next bid: {formatAUD(minimumBid)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Enter ${minimumBid} or higher`}
                  />
                  <Button onClick={submitDemoBid}>Place demo bid</Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    Temporary bid history
                  </p>

                  {demoBids.length === 0 ? (
                    <p className="rounded-xl border bg-white px-3 py-3 text-sm text-neutral-500">
                      No bids yet. Real persistent bidding is the next build step.
                    </p>
                  ) : (
                    demoBids.map((bid, index) => (
                      <div
                        key={`${bid.bidder}-${bid.amount}-${index}`}
                        className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{bid.bidder}</p>
                          <p className="text-xs text-neutral-500">{bid.time}</p>
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
