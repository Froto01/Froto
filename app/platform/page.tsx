"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  LayoutDashboard,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

type MarketplaceTender = {
  id: string;
  title: string;
  productDescription: string;
  volume: string;
  origin: string;
  destination: string;
  storageRequired: boolean;
  temperatureRequirement: string | null;
  deliveryDate: string;
  responseClosesAt: string;
  responseClosed: boolean;
  notes: string | null;
  status: "OPEN" | "CLOSED" | "AWARDED";
  companyName: string;
  companyVerified: boolean;
  responseCount: number;
  isOwner: boolean;
  hasResponded: boolean;
  viewerResponseAmount: number | null;
  awardedResponseId: string | null;
  awardedAt: string | null;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
  const [activeTab, setActiveTab] = useState<"marketplace" | "tenders">("marketplace");
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [marketplaceTenders, setMarketplaceTenders] = useState<MarketplaceTender[]>([]);
  const [tendersLoading, setTendersLoading] = useState(true);
  const [tendersError, setTendersError] = useState<string | null>(null);

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
      if (showLoading) setListingsLoading(true);

      try {
        const response = await fetch("/api/listings", { cache: "no-store" });
        if (!response.ok) throw new Error("Marketplace listings could not be loaded.");
        const data = (await response.json()) as MarketplaceListing[];
        if (!cancelled) {
          setMarketplaceListings(data);
          setListingsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setListingsError(error instanceof Error ? error.message : "Marketplace listings could not be loaded.");
        }
      } finally {
        if (!cancelled && showLoading) setListingsLoading(false);
      }
    }

    async function loadTenders(showLoading = false) {
      if (showLoading) setTendersLoading(true);

      try {
        const response = await fetch("/api/tenders", { cache: "no-store" });
        if (!response.ok) throw new Error("Tenders could not be loaded.");
        const data = (await response.json()) as MarketplaceTender[];
        if (!cancelled) {
          setMarketplaceTenders(data);
          setTendersError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setTendersError(error instanceof Error ? error.message : "Tenders could not be loaded.");
        }
      } finally {
        if (!cancelled && showLoading) setTendersLoading(false);
      }
    }

    void loadListings(true);
    void loadTenders(true);

    const refreshTimer = window.setInterval(() => {
      void loadListings(false);
      void loadTenders(false);
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
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [marketplaceListings, query]);

  const filteredTenders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marketplaceTenders.filter((tender) => {
      const searchable = [
        tender.title,
        tender.productDescription,
        tender.volume,
        tender.origin,
        tender.destination,
        tender.companyName,
        tender.temperatureRequirement ?? "",
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [marketplaceTenders, query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-20">
      <header className="sticky top-0 z-40 border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/" aria-label="Froto home" className="shrink-0 rounded-xl px-1 py-0.5 transition-opacity hover:opacity-90">
            <Image src="/brand/froto-logo.svg" alt="Froto. Connect. Match. Move." width={168} height={42} priority className="h-10 w-auto" />
          </Link>

          {showSearch && (
            <div className="ml-auto hidden w-[40ch] items-center gap-2 md:flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-froto-blue" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === "tenders" ? "Search tenders" : "Search logistics"} className="border-froto-blue/15 bg-froto-ice/70 pl-9 focus-visible:ring-froto-blue" />
              </div>
            </div>
          )}

          <Button asChild variant="outline" className="ml-auto gap-2 border-froto-blue/15 bg-white text-froto-navy md:ml-2">
            <Link href="/platform/dashboard"><LayoutDashboard className="h-4 w-4 text-froto-blue" />Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 border-froto-teal/20 bg-white text-froto-navy">
            <Link href="/platform/listings/new"><Plus className="h-4 w-4 text-froto-teal" />Create Listing</Link>
          </Button>
          <Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]">
            <Link href="/platform/onboarding"><UserPlus className="h-4 w-4" />Company Profile</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-7">
        <div className="mb-7 flex w-fit items-center gap-1 rounded-full border border-froto-blue/10 bg-white p-1 shadow-sm">
          <button className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "marketplace" ? "bg-froto-navy text-white shadow-sm" : "text-slate-500 hover:bg-froto-ice hover:text-froto-navy"}`} onClick={() => setActiveTab("marketplace")}>Marketplace</button>
          <button className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "tenders" ? "bg-gradient-to-r from-froto-teal to-froto-green text-white shadow-sm" : "text-slate-500 hover:bg-froto-ice hover:text-froto-navy"}`} onClick={() => setActiveTab("tenders")}>Tenders</button>
        </div>

        {activeTab === "marketplace" && (
          <>
            <div className="mb-7 flex flex-col gap-4 rounded-[1.75rem] border border-froto-blue/10 bg-white/80 p-6 shadow-sm shadow-froto-navy/5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Live marketplace</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-froto-navy">Available logistics capacity</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Open a listing to view live bid history, bidding close time and authenticated company activity.</p>
              </div>
              <Button asChild className="gap-2 rounded-xl bg-froto-navy hover:bg-[#0a356f]"><Link href="/platform/listings/new"><Plus className="h-4 w-4" />List capacity</Link></Button>
            </div>

            {listingsLoading ? (
              <Card className="rounded-[1.6rem] border-froto-blue/10 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading live marketplace listings...</Card>
            ) : listingsError ? (
              <Card className="rounded-[1.6rem] border-red-100 bg-red-50/70 p-6 text-sm text-red-700 shadow-sm">{listingsError}</Card>
            ) : filteredListings.length === 0 ? (
              <Card className="rounded-[1.6rem] border-froto-blue/10 bg-white p-8 text-center shadow-sm">
                <CardTitle className="text-lg text-froto-navy">No live capacity found</CardTitle>
                <p className="mt-2 text-sm text-slate-500">Create the first Froto listing or change your search.</p>
                <Button asChild className="mt-4 rounded-xl bg-froto-navy hover:bg-[#0a356f]"><Link href="/platform/listings/new">Create Listing</Link></Button>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="group overflow-hidden rounded-[1.6rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="relative overflow-hidden">
                      <Image src={listingImage(listing)} alt={listing.title} width={1200} height={800} className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-froto-navy/30 to-transparent" />
                      <div className="absolute left-3 top-3 flex gap-2">
                        <Badge className="border border-white/50 bg-white/92 text-froto-navy shadow-sm">{listing.listingType}</Badge>
                        <Badge className={listing.auctionState === "CLOSED" ? "bg-froto-navy text-white" : "bg-froto-green text-white"}>{listing.auctionState === "CLOSED" ? "Bidding closed" : "Bidding open"}</Badge>
                      </div>
                    </div>
                    <CardContent className="space-y-4 p-5">
                      <div><h2 className="text-xl font-semibold text-froto-navy">{listing.title}</h2><p className="mt-1 text-xs text-slate-500">Listed by {listing.companyName}{listing.companyVerified ? " · Verified" : ""}</p></div>
                      <div className="rounded-2xl bg-froto-ice px-4 py-3 text-sm"><p className="font-medium text-slate-700">{listing.capacityAmount} {listing.capacityUnit} · {listing.temperatureClass}</p><p className="mt-1 text-slate-500">{listingLocation(listing)}</p></div>
                      <p className="text-xs font-medium text-slate-500">{listing.biddingClosesAt ? `${listing.auctionState === "CLOSED" ? "Closed" : "Closes"} ${formatDateTime(listing.biddingClosesAt)}` : "No bidding close time set"}</p>
                      <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                        <div><p className="text-xs text-slate-500">{listing.bidCount > 0 ? listing.auctionState === "CLOSED" ? "Final bid" : "Current bid" : "Starting bid"}</p><span className="mt-1 block text-2xl font-semibold text-froto-navy">{formatAUD(listing.currentBid)}</span><p className="text-xs text-froto-teal">{listing.bidCount} {listing.bidCount === 1 ? "bid" : "bids"}</p></div>
                        <Button asChild className={`flex items-center gap-1 rounded-xl ${listing.auctionState === "CLOSED" ? "bg-froto-navy hover:bg-[#0a356f]" : "bg-froto-blue hover:bg-[#0969ba]"}`}><Link href={`/platform/listing/${listing.id}`}>{listing.auctionState === "CLOSED" ? "View" : "Bid"}<ArrowUpRight className="h-4 w-4" /></Link></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "tenders" && (
          <div id="tenders" className="space-y-5">
            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-emerald-100 bg-gradient-to-r from-cyan-50/70 to-emerald-50/70 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-teal">Structured sourcing</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-froto-navy">Live tenders</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Publish requirements, receive sealed company quotes and award the best fit after the response window closes.</p>
              </div>
              <Button asChild className="gap-2 rounded-xl bg-froto-teal hover:bg-[#0c8d82]"><Link href="/platform/tenders/new"><Plus className="h-4 w-4" />Create Tender</Link></Button>
            </div>

            {tendersLoading ? (
              <Card className="rounded-[1.6rem] border-emerald-100 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading live tenders...</Card>
            ) : tendersError ? (
              <Card className="rounded-[1.6rem] border-red-100 bg-red-50/70 p-6 text-sm text-red-700 shadow-sm">{tendersError}</Card>
            ) : filteredTenders.length === 0 ? (
              <Card className="rounded-[1.6rem] border-emerald-100 bg-white p-8 text-center shadow-sm">
                <CardTitle className="text-lg text-froto-navy">No tenders found</CardTitle>
                <p className="mt-2 text-sm text-slate-500">Create the first live tender or change your search.</p>
                <Button asChild className="mt-4 bg-froto-teal hover:bg-[#0c8d82]"><Link href="/platform/tenders/new">Create Tender</Link></Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTenders.map((tender) => (
                  <Card key={tender.id} className="overflow-hidden rounded-[1.6rem] border-emerald-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="h-1 bg-gradient-to-r from-froto-teal to-froto-green" />
                    <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-froto-navy">{tender.title}</p>
                          <Badge className={tender.status === "AWARDED" ? "bg-froto-green text-white" : tender.status === "CLOSED" ? "bg-froto-navy text-white" : "bg-froto-teal text-white"}>{tender.status === "AWARDED" ? "Awarded" : tender.status === "CLOSED" ? "Responses closed" : "Open"}</Badge>
                          {tender.isOwner ? <Badge className="border border-froto-blue/15 bg-blue-50 text-froto-blue">Your tender</Badge> : null}
                          {tender.hasResponded ? <Badge className="border border-emerald-200 bg-emerald-50 text-froto-green">Responded</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Issued by {tender.companyName}{tender.companyVerified ? " · Verified" : ""}</p>
                        <p className="mt-3 text-sm font-medium text-froto-navy">{tender.productDescription}</p>
                        <p className="mt-1 text-sm text-slate-600">{tender.volume} · {tender.origin} to {tender.destination}</p>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                          <span>Delivery {formatDate(tender.deliveryDate)}</span>
                          <span>{tender.responseClosed ? "Closed" : "Closes"} {formatDateTime(tender.responseClosesAt)}</span>
                          <span>{tender.responseCount} sealed {tender.responseCount === 1 ? "response" : "responses"}</span>
                        </div>
                      </div>

                      <div className="flex min-w-44 flex-col items-stretch gap-2 md:items-end">
                        {tender.responseCount > 0 ? <p className="text-sm font-medium text-slate-500">Supplier pricing sealed</p> : <p className="text-sm text-slate-500">No responses yet</p>}
                        {tender.viewerResponseAmount !== null ? <p className="text-xs font-medium text-froto-teal">Your response: {formatAUD(tender.viewerResponseAmount)}</p> : null}
                        <Button asChild className={tender.status === "OPEN" && !tender.isOwner && !tender.hasResponded ? "bg-froto-teal hover:bg-[#0c8d82]" : "bg-froto-navy hover:bg-[#0a356f]"}><Link href={`/platform/tenders/${tender.id}`}>{tender.status === "OPEN" && !tender.isOwner && !tender.hasResponded ? "Respond" : "View tender"}<ArrowUpRight className="ml-1 h-4 w-4" /></Link></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
