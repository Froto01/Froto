"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Search,
  ArrowUpRight,
  Plus,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MOCK_TENDERS } from "@/lib/mock-data";

const showSearch = true;

type MarketplaceListing = {
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
  auctionState: "OPEN" | "CLOSED";
  currentBid: number;
  bidCount: number;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function listingLocation(listing: MarketplaceListing) {
  if (listing.listingType === "Transport Lane") {
    return `${listing.origin ?? "Origin"} to ${listing.destination ?? "Destination"}`;
  }

  return listing.location ?? "Location not supplied";
}

function listingImage(listing: MarketplaceListing) {
  return listing.listingType === "Warehouse Space"
    ? "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80";
}

export default function PlatformPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"marketplace" | "tenders">(
    "marketplace"
  );
  const [marketplaceListings, setMarketplaceListings] = useState<
    MarketplaceListing[]
  >([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  useEffect(() => {
    const openTenderHash = () => {
      if (window.location.hash === "#tenders") {
        setActiveTab("tenders");
      }
    };

    queueMicrotask(openTenderHash);
    window.addEventListener("hashchange", openTenderHash);

    return () => window.removeEventListener("hashchange", openTenderHash);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadListings(showLoading = false) {
      if (showLoading) {
        setListingsLoading(true);
      }

      try {
        const response = await fetch("/api/listings", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Marketplace listings could not be loaded.");
        }

        const data = (await response.json()) as MarketplaceListing[];

        if (!cancelled) {
          setMarketplaceListings(data);
          setListingsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setListingsError(
            error instanceof Error
              ? error.message
              : "Marketplace listings could not be loaded."
          );
        }
      } finally {
        if (!cancelled && showLoading) {
          setListingsLoading(false);
        }
      }
    }

    void loadListings(true);

    const refreshTimer = window.setInterval(() => {
      void loadListings(false);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase();

    return marketplaceListings.filter((listing) => {
      const searchable = [
        listing.title,
        listing.listingType,
        listingLocation(listing),
        listing.companyName,
        listing.temperatureClass,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [marketplaceListings, query]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Froto home"
            className="shrink-0 rounded-xl px-1 py-0.5 transition-opacity hover:opacity-90"
          >
            <Image
              src="/brand/froto-logo.svg"
              alt="Froto. Connect. Match. Move."
              width={168}
              height={42}
              priority
              className="h-10 w-auto"
            />
          </Link>

          {showSearch && (
            <div className="ml-auto hidden md:flex items-center gap-2 w-[40ch]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search logistics"
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <Button asChild variant="outline" className="ml-auto gap-2 md:ml-2">
            <Link href="/platform/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/platform/listings/new">
              <Plus className="h-4 w-4" />
              Create Listing
            </Link>
          </Button>

          <Button asChild className="gap-2">
            <Link href="/platform/onboarding">
              <UserPlus className="h-4 w-4" />
              Company Profile
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="mb-6 flex items-center gap-2 rounded-full bg-neutral-100 p-1 w-fit">
          <button
            className={`px-4 py-1 text-sm rounded-full ${
              activeTab === "marketplace"
                ? "bg-white shadow-sm font-medium"
                : "text-neutral-500"
            }`}
            onClick={() => setActiveTab("marketplace")}
          >
            Marketplace
          </button>

          <button
            className={`px-4 py-1 text-sm rounded-full ${
              activeTab === "tenders"
                ? "bg-white shadow-sm font-medium"
                : "text-neutral-500"
            }`}
            onClick={() => setActiveTab("tenders")}
          >
            Tenders
          </button>
        </div>

        {activeTab === "marketplace" && (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Live marketplace
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
                  Available logistics capacity
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Open a listing to view live bid history and place an authenticated company bid.
                </p>
              </div>

              <Button asChild className="gap-2">
                <Link href="/platform/listings/new">
                  <Plus className="h-4 w-4" />
                  List capacity
                </Link>
              </Button>
            </div>

            {listingsLoading ? (
              <Card className="rounded-2xl p-6 text-sm text-neutral-500 shadow-sm">
                Loading live marketplace listings...
              </Card>
            ) : listingsError ? (
              <Card className="rounded-2xl border-red-100 p-6 text-sm text-red-700 shadow-sm">
                {listingsError}
              </Card>
            ) : filteredListings.length === 0 ? (
              <Card className="rounded-2xl p-8 text-center shadow-sm">
                <CardTitle className="text-lg">No live capacity found</CardTitle>
                <p className="mt-2 text-sm text-neutral-500">
                  Create the first Froto listing or change your search.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/platform/listings/new">Create Listing</Link>
                </Button>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredListings.map((listing) => (
                  <Card
                    key={listing.id}
                    className="overflow-hidden rounded-2xl shadow-sm"
                  >
                    <div className="relative">
                      <Image
                        src={listingImage(listing)}
                        alt={listing.title}
                        width={1200}
                        height={800}
                        className="h-48 w-full object-cover"
                      />
                      <div className="absolute left-3 top-3 flex gap-2">
                        <Badge className="bg-white/90 text-black border">
                          {listing.listingType}
                        </Badge>
                        <Badge
                          className={
                            listing.auctionState === "CLOSED"
                              ? "bg-neutral-900 text-white"
                              : "bg-sky-600 text-white"
                          }
                        >
                          {listing.auctionState === "CLOSED"
                            ? "Bidding closed"
                            : "Bidding open"}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{listing.title}</CardTitle>
                      <p className="text-xs text-neutral-500">
                        Listed by {listing.companyName}
                        {listing.companyVerified ? " · Verified" : ""}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                      <p className="text-neutral-700">
                        {listing.capacityAmount} {listing.capacityUnit} · {listing.temperatureClass}
                      </p>
                      <p className="text-neutral-500">
                        {listingLocation(listing)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {listing.biddingClosesAt
                          ? `${listing.auctionState === "CLOSED" ? "Closed" : "Closes"} ${formatDateTime(
                              listing.biddingClosesAt
                            )}`
                          : "No bidding close time set"}
                      </p>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-neutral-500">
                            {listing.bidCount > 0
                              ? listing.auctionState === "CLOSED"
                                ? "Final bid"
                                : "Current bid"
                              : "Starting bid"}
                          </p>
                          <span className="font-semibold text-lg">
                            {formatAUD(listing.currentBid)}
                          </span>
                          <p className="text-xs text-neutral-500">
                            {listing.bidCount} {listing.bidCount === 1 ? "bid" : "bids"}
                          </p>
                        </div>
                        <Button
                          asChild
                          className="rounded-2xl flex items-center gap-1"
                        >
                          <Link href={`/platform/listing/${listing.id}`}>
                            {listing.auctionState === "CLOSED" ? "View" : "Bid"}{" "}
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "tenders" && (
          <div id="tenders" className="space-y-4">
            <div className="flex justify-end">
              <Button asChild className="gap-2">
                <Link href="/platform/tenders/new">
                  <Plus className="h-4 w-4" />
                  Create Tender
                </Link>
              </Button>
            </div>

            {MOCK_TENDERS.map((tender) => {
              const total = tender.productCost + tender.logisticsCost;

              return (
                <Card key={tender.id} className="rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {tender.title}
                      </p>
                      <p className="text-sm text-neutral-600 mt-1">
                        Product: {formatAUD(tender.productCost)} | Logistics:{" "}
                        {formatAUD(tender.logisticsCost)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">
                        {formatAUD(total)}
                      </span>
                      <Button variant="outline">View</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
