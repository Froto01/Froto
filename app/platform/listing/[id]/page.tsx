"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEMO_BIDS, LOGISTICS_LISTINGS } from "@/lib/mock-data";

function formatAUD(v: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(v);
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const listing = LOGISTICS_LISTINGS.find((item) => item.id === params.id);
  const [bidAmount, setBidAmount] = useState("");
  const [demoBids, setDemoBids] = useState(DEMO_BIDS);

  const highestBid = useMemo(() => {
    if (!listing) {
      return 0;
    }

    return Math.max(listing.currentBid, ...demoBids.map((bid) => bid.amount));
  }, [demoBids, listing]);

  const minimumBid = highestBid + 10;

  function submitDemoBid() {
    const amount = Number(bidAmount);

    if (!amount || amount < minimumBid) {
      alert(`Minimum bid is ${formatAUD(minimumBid)}`);
      return;
    }

    setDemoBids([{ bidder: "You", amount, time: "Just now" }, ...demoBids]);
    setBidAmount("");
  }

  if (!listing) {
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
              This demo listing does not exist yet.
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
                  alt={listing.name}
                  width={1200}
                  height={800}
                  priority
                  className="h-72 w-full object-cover sm:h-96"
                />
                <Badge className="absolute left-4 top-4 bg-white/90 text-black border">
                  {listing.type}
                </Badge>
              </div>

              <CardHeader>
                <CardTitle className="text-2xl">{listing.name}</CardTitle>
                <p className="text-sm text-neutral-500">{listing.location}</p>
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
                      Current bid
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {formatAUD(listing.currentBid)}
                    </dd>
                  </div>

                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Type
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {listing.type}
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
                </dl>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-3xl border-sky-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Demo bid room</CardTitle>
                <p className="text-sm text-neutral-500">
                  Front-end-only bidding for this listing. Nothing is saved yet.
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
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
          </section>
        </div>
      </div>
    </main>
  );
}
