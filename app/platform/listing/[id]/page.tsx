"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BidOutcome = "ACTIVE" | "WINNER" | "UNSUCCESSFUL";

type LiveBid = {
  id: string;
  amount: number;
  createdAt: string;
  bidderCompanyName: string;
  bidderCompanyVerified: boolean;
  bidderCompanyId: string;
  outcome: BidOutcome;
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
  biddingClosesAt: string | null;
  biddingClosed: boolean;
  auctionState: string;
  currentBid: number;
  minimumNextBid: number;
  bidCount: number;
  bids: LiveBid[];
  awardedBidId: string | null;
  awardedAt: string | null;
  notes: string | null;
  status: string;
  companyName: string;
  companyVerified: boolean;
  isOwner: boolean;
  canAward: boolean;
  viewerCompanyId: string | null;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

function auctionLabel(state: string) {
  if (state === "AWARDED") {
    return "Awarded";
  }

  if (state === "CLOSED") {
    return "Bidding closed";
  }

  return "Bidding open";
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
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awardSuccess, setAwardSuccess] = useState<string | null>(null);
  const [awardingBidId, setAwardingBidId] = useState<string | null>(null);

  const loadListing = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setIsLoading(true);
      }

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
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [params.id]
  );

  useEffect(() => {
    void loadListing();

    const refreshTimer = window.setInterval(() => {
      void loadListing(false);
    }, 10000);

    return () => window.clearInterval(refreshTimer);
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
      await loadListing(false);
    } catch (error) {
      setBidError(
        error instanceof Error ? error.message : "The bid could not be placed."
      );
    } finally {
      setIsSubmittingBid(false);
    }
  }

  async function awardBid(bid: LiveBid) {
    if (!listing) {
      return;
    }

    const confirmed = window.confirm(
      `Award this listing to ${bid.bidderCompanyName} for ${formatAUD(bid.amount)}?`
    );

    if (!confirmed) {
      return;
    }

    setAwardingBidId(bid.id);
    setAwardError(null);
    setAwardSuccess(null);

    try {
      const response = await fetch(`/api/listings/${listing.id}/award`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bidId: bid.id }),
      });

      const data = (await response.json()) as {
        error?: string;
        winnerCompanyName?: string;
        amount?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "The listing could not be awarded.");
      }

      setAwardSuccess(
        `Awarded to ${data.winnerCompanyName ?? bid.bidderCompanyName} for ${formatAUD(
          data.amount ?? bid.amount
        )}.`
      );
      await loadListing(false);
    } catch (error) {
      setAwardError(
        error instanceof Error
          ? error.message
          : "The listing could not be awarded."
      );
    } finally {
      setAwardingBidId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Card className="rounded-[1.6rem] border-froto-blue/10 bg-white p-6 text-sm text-slate-500 shadow-md shadow-froto-navy/5">
            Loading listing...
          </Card>
        </div>
      </main>
    );
  }

  if (!listing || loadError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Button
            asChild
            variant="outline"
            className="mb-6 gap-2 border-froto-blue/15 bg-white text-froto-navy"
          >
            <Link href="/platform">
              <ArrowLeft className="h-4 w-4 text-froto-blue" />
              Back to marketplace
            </Link>
          </Button>

          <Card className="rounded-[1.6rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <CardTitle className="text-froto-navy">Listing not found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
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
  const biddingOpen = listing.auctionState === "OPEN";
  const winningBid = listing.bids.find((bid) => bid.id === listing.awardedBidId);

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-6xl px-4 py-7">
        <Button
          asChild
          variant="outline"
          className="mb-6 gap-2 border-froto-blue/15 bg-white text-froto-navy"
        >
          <Link href="/platform">
            <ArrowLeft className="h-4 w-4 text-froto-blue" />
            Back to marketplace
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden rounded-[1.8rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
              <div className="relative overflow-hidden">
                <Image
                  src={listingImage(listing.listingType)}
                  alt={listing.title}
                  width={1200}
                  height={800}
                  priority
                  className="h-72 w-full object-cover sm:h-96"
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-froto-navy/55 via-froto-navy/15 to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  <Badge className="border border-white/50 bg-white/92 text-froto-navy shadow-sm">
                    {listing.listingType}
                  </Badge>
                  <Badge
                    className={
                      listing.auctionState === "AWARDED"
                        ? "bg-froto-green text-white"
                        : listing.auctionState === "CLOSED"
                          ? "bg-froto-navy text-white"
                          : "bg-froto-blue text-white"
                    }
                  >
                    {auctionLabel(listing.auctionState)}
                  </Badge>
                </div>
              </div>

              <CardHeader className="border-b border-froto-blue/10 bg-white">
                <CardTitle className="text-3xl tracking-tight text-froto-navy">
                  {listing.title}
                </CardTitle>
                <p className="text-sm font-medium text-froto-teal">{location}</p>
                <p className="text-sm text-slate-500">
                  Listed by {listing.companyName}
                  {listing.companyVerified ? " · Verified" : ""}
                </p>
              </CardHeader>

              <CardContent className="p-6">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-froto-blue/10 bg-blue-50/45 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-blue">
                      Capacity
                    </dt>
                    <dd className="mt-1 font-medium text-froto-navy">
                      {listing.capacityAmount} {listing.capacityUnit}
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-froto-teal/10 bg-teal-50/45 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-teal">
                      Starting bid
                    </dt>
                    <dd className="mt-1 font-medium text-froto-navy">
                      {formatAUD(listing.startingBid)}
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-froto-green/10 bg-emerald-50/45 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-green">
                      Temperature class
                    </dt>
                    <dd className="mt-1 font-medium capitalize text-froto-navy">
                      {listing.temperatureClass}
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-froto-cyan/10 bg-cyan-50/45 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-cyan">
                      Availability
                    </dt>
                    <dd className="mt-1 font-medium text-froto-navy">
                      {formatDate(listing.availableFrom)} to {formatDate(listing.availableTo)}
                    </dd>
                  </div>

                  <div className="rounded-2xl border border-froto-blue/10 bg-froto-ice p-4 sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Bidding closes
                    </dt>
                    <dd className="mt-1 flex items-center gap-2 font-medium text-froto-navy">
                      <Clock3 className="h-4 w-4 text-froto-blue" />
                      {listing.biddingClosesAt
                        ? formatDateTime(listing.biddingClosesAt)
                        : "No close time set on this legacy listing"}
                    </dd>
                  </div>
                </dl>

                {listing.notes ? (
                  <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/65 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Notes
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{listing.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="overflow-hidden rounded-[1.8rem] border-froto-blue/10 bg-white shadow-xl shadow-froto-navy/8">
              <div className="bg-gradient-to-r from-froto-navy via-[#0a4778] to-froto-teal px-6 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Live marketplace
                </p>
                <h2 className="mt-1 text-xl font-semibold">Bid room</h2>
                <p className="mt-1 text-sm text-white/75">
                  Authenticated company bids, live status and award history.
                </p>
              </div>

              <CardContent className="space-y-5 p-6">
                <div
                  className={`rounded-2xl border p-5 ${
                    listing.auctionState === "AWARDED"
                      ? "border-froto-green/15 bg-emerald-50/70"
                      : listing.auctionState === "CLOSED"
                        ? "border-froto-navy/10 bg-slate-100/80"
                        : "border-froto-blue/15 bg-blue-50/70"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                    {listing.auctionState === "OPEN"
                      ? "Current bid"
                      : listing.auctionState === "AWARDED"
                        ? "Winning bid"
                        : "Final bid"}
                  </p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight text-froto-navy">
                    {formatAUD(
                      listing.auctionState === "AWARDED" && winningBid
                        ? winningBid.amount
                        : listing.currentBid
                    )}
                  </p>

                  {listing.auctionState === "OPEN" ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Minimum next bid: {formatAUD(listing.minimumNextBid)}
                    </p>
                  ) : listing.auctionState === "CLOSED" ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Bidding has closed. The listing company can now award a winner.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-emerald-800">
                      Awarded to {winningBid?.bidderCompanyName ?? "winning company"}
                      {listing.awardedAt ? ` · ${formatDateTime(listing.awardedAt)}` : ""}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-500">
                    {listing.bidCount === 0
                      ? "No bids placed"
                      : `${listing.bidCount} ${listing.bidCount === 1 ? "bid" : "bids"} placed`}
                  </p>
                </div>

                {biddingOpen && !listing.isOwner ? (
                  <div className="rounded-2xl border border-froto-blue/10 bg-froto-ice/70 p-4">
                    <p className="mb-3 text-sm font-semibold text-froto-navy">Place your bid</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={listing.minimumNextBid}
                        step="0.01"
                        value={bidAmount}
                        onChange={(event) => setBidAmount(event.target.value)}
                        placeholder={`Enter ${listing.minimumNextBid} or higher`}
                        disabled={isSubmittingBid}
                        className="border-froto-blue/15 bg-white focus-visible:border-froto-blue focus-visible:ring-froto-blue/20"
                      />
                      <Button
                        onClick={submitBid}
                        disabled={isSubmittingBid}
                        className="bg-froto-navy hover:bg-[#0a356f]"
                      >
                        {isSubmittingBid ? "Placing..." : "Place bid"}
                      </Button>
                    </div>
                  </div>
                ) : listing.isOwner && biddingOpen ? (
                  <p className="rounded-xl border border-froto-blue/10 bg-froto-ice/70 px-4 py-3 text-sm text-slate-600">
                    This is your company listing. You can watch bidding here, but you cannot bid on your own capacity.
                  </p>
                ) : null}

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

                {awardError ? (
                  <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {awardError}
                  </p>
                ) : null}

                {awardSuccess ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <Trophy className="h-4 w-4" />
                    {awardSuccess}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-froto-navy">Bid history</p>
                    <span className="text-xs text-slate-400">Refreshes automatically</span>
                  </div>

                  {listing.bids.length === 0 ? (
                    <p className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-3 text-sm text-slate-500">
                      No bids yet.
                    </p>
                  ) : (
                    listing.bids.map((bid, index) => {
                      const isViewerCompany = listing.viewerCompanyId === bid.bidderCompanyId;

                      return (
                        <div
                          key={bid.id}
                          className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-froto-navy">
                                  {bid.bidderCompanyName}
                                  {bid.bidderCompanyVerified ? " · Verified" : ""}
                                </p>
                                {index === 0 && listing.auctionState !== "AWARDED" ? (
                                  <Badge className="border border-froto-blue/15 bg-blue-50 text-froto-blue hover:bg-blue-50">
                                    Highest bid
                                  </Badge>
                                ) : null}
                                {isViewerCompany ? (
                                  <Badge className="border border-froto-teal/15 bg-teal-50 text-froto-teal hover:bg-teal-50">
                                    Your company
                                  </Badge>
                                ) : null}
                                {bid.outcome === "WINNER" ? (
                                  <Badge className="bg-froto-green text-white">Winner</Badge>
                                ) : bid.outcome === "UNSUCCESSFUL" ? (
                                  <Badge variant="outline">Unsuccessful</Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatBidTime(bid.createdAt)}
                              </p>
                            </div>
                            <p className="font-semibold text-froto-blue">
                              {formatAUD(bid.amount)}
                            </p>
                          </div>

                          {listing.canAward ? (
                            <Button
                              size="sm"
                              className="mt-3 w-full bg-froto-navy hover:bg-[#0a356f]"
                              onClick={() => void awardBid(bid)}
                              disabled={awardingBidId !== null}
                            >
                              {awardingBidId === bid.id
                                ? "Awarding..."
                                : `Award to ${bid.bidderCompanyName}`}
                            </Button>
                          ) : null}
                        </div>
                      );
                    })
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
