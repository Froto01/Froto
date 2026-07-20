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
import { DEMO_BIDS, LOGISTICS_LISTINGS, MOCK_TENDERS } from "@/lib/mock-data";

const showSearch = true;

function formatAUD(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(v);
}

export default function PlatformPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"marketplace" | "tenders">(
    "marketplace"
  );

  const [bidAmount, setBidAmount] = useState("");
  const [demoBids, setDemoBids] = useState(DEMO_BIDS);

  const highestBid = Math.max(...demoBids.map((b) => b.amount));
  const minimumBid = highestBid + 10;

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

  function submitDemoBid() {
    const amount = Number(bidAmount);

    if (!amount || amount < minimumBid) {
      alert(`Minimum bid is ${formatAUD(minimumBid)}`);
      return;
    }

    setDemoBids([{ bidder: "You", amount, time: "Just now" }, ...demoBids]);
    setBidAmount("");
  }

  const filteredListings = useMemo(() => {
    const q = query.toLowerCase();
    return LOGISTICS_LISTINGS.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
              FR
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-neutral-900 text-sm">Froto</span>
              <span className="text-[10px] text-neutral-500 -mt-1">
                Bid. Move. Deliver.
              </span>
            </div>
          </div>

          {showSearch && (
            <div className="ml-auto hidden md:flex items-center gap-2 w-[40ch]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
              Get Started
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
            <Card className="mb-6 rounded-3xl border-sky-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Demo bid room</CardTitle>
                <p className="text-sm text-neutral-500">
                  Example auction: Sydney to Melbourne linehaul - 22 pallet
                  spaces available.
                </p>
              </CardHeader>

              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-sky-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">
                      Current highest bid
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
                    <Button onClick={submitDemoBid}>Place bid</Button>
                  </div>

                  <p className="text-xs text-neutral-500">
                    Demo only. Later this will connect to user accounts, auction
                    timers, bid increments, anti-sniping and notifications.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    Bid history
                  </p>

                  {demoBids.map((bid, index) => (
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
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredListings.map((l) => (
                <Card key={l.id} className="overflow-hidden rounded-2xl shadow-sm">
                  <div className="relative">
                    <Image
                      src={l.image}
                      alt={l.name}
                      width={1200}
                      height={800}
                      className="h-48 w-full object-cover"
                    />
                    <Badge className="absolute left-3 top-3 bg-white/90 text-black border">
                      {l.type}
                    </Badge>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{l.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    <p className="text-neutral-700">{l.capacity}</p>
                    <p className="text-neutral-500">{l.location}</p>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">
                        {formatAUD(l.currentBid)}
                      </span>
                      <Button asChild className="rounded-2xl flex items-center gap-1">
                        <Link href={`/platform/listing/${l.id}`}>
                          Bid <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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

            {MOCK_TENDERS.map((t) => {
              const total = t.productCost + t.logisticsCost;

              return (
                <Card key={t.id} className="rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{t.title}</p>
                      <p className="text-sm text-neutral-600 mt-1">
                        Product: {formatAUD(t.productCost)} | Logistics:{" "}
                        {formatAUD(t.logisticsCost)}
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
