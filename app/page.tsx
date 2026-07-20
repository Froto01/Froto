"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Truck,
  Warehouse,
  LineChart,
  CheckCircle2,
  ArrowUpRight,
  Flame,
  Clock3,
  PackageCheck,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LIVE_CAPACITY = [
  {
    id: "1",
    type: "Transport",
    lane: "Sydney → Melbourne",
    capacity: "22 pallet spaces",
    bid: "$210",
    timeLeft: "1h 42m left",
    badge: "Hot",
    activity: "+12% bid activity",
  },
  {
    id: "2",
    type: "Warehouse",
    lane: "Brisbane 3PL – Chilled",
    capacity: "80 pallet positions",
    bid: "$28 / pallet / week",
    timeLeft: "4h 15m left",
    badge: "New",
    activity: "Fresh listing",
  },
  {
    id: "3",
    type: "Transport",
    lane: "Perth → Adelaide",
    capacity: "12 pallet spaces",
    bid: "$330",
    timeLeft: "52m left",
    badge: "Closing",
    activity: "Ends soon",
  },
  {
    id: "4",
    type: "Warehouse",
    lane: "Melbourne 3PL – Ambient",
    capacity: "120 pallet positions",
    bid: "$18 / pallet / week",
    timeLeft: "6h 08m left",
    badge: "Live",
    activity: "+5 new views",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <section className="relative border-b overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: "url('/images/hero-truck.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-neutral-50" />

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 lg:pb-28 flex flex-col lg:flex-row gap-10 items-center">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-neutral-700 shadow-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-semibold text-white">
                FR
              </span>
              <span className="font-medium">Froto</span>
              <span className="h-3 w-px bg-neutral-200" />
              <span className="font-medium text-neutral-500">Bid. Move. Deliver.</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-neutral-900">
              Bid for{" "}
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                warehouse & transport
              </span>{" "}
              capacity like it&apos;s an online marketplace.
            </h1>

            <p className="text-sm sm:text-base text-neutral-600 max-w-xl">
              Froto is a logistics marketplace where shippers bid on spare capacity
              in 3PL warehouses and on trucks. Raise tenders for product + logistics,
              compare total landed cost, and move goods from ↔ to with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex gap-2">
                <Button asChild className="gap-2">
                  <Link href="/platform">
                    Open marketplace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/platform#tenders">View tenders</Link>
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                No credit card in this demo. Just explore how it could work.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 pt-2 text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                </div>
                <span>Bid-based pricing on pallet & parcel space</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-sky-50 flex items-center justify-center">
                  <Truck className="h-3 w-3 text-sky-600" />
                </div>
                <span>Transport + warehouse in one platform</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md mx-auto space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">Live marketplace</CardTitle>
                  <p className="text-xs text-neutral-500">Bidding on spare logistics capacity</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-sky-100 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-sky-700" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">Pallet space – Sydney 3PL</span>
                  <span className="text-neutral-500">120 pallets</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Current bid</span>
                  <span className="font-semibold">$18.00 / pallet / week</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Linehaul – MEL → BNE</span>
                  <span>22 pallet spaces</span>
                </div>
                <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500">
                  This is a static preview. Click &quot;Open marketplace&quot; above to play with the
                  real bidding UI.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed border-sky-200 bg-sky-50/60">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">Tenders & RFQs</CardTitle>
                  <p className="text-xs text-neutral-500">
                    Structured sourcing for products + logistics
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center">
                  <LineChart className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>FMCG monthly replenishment – East Coast</span>
                  <span className="font-semibold text-emerald-700">$44.5k</span>
                </div>
                <p className="text-neutral-500">
                  Offers ranked by total cost (product + logistics + fees). You choose cost-only
                  or build a scorecard across service + risk.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Freight Board */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                Live capacity
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mt-1">
                A real-time freight board feel
              </h2>
              <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
                Available transport lanes and warehouse space displayed like active marketplace
                listings, so users instantly understand what Froto does.
              </p>
            </div>

            <Button asChild variant="outline" className="gap-1">
              <Link href="/platform">
                View all live listings
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            <div className="grid grid-cols-12 gap-3 border-b bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              <div className="col-span-5 sm:col-span-5">Lane / Listing</div>
              <div className="col-span-3 sm:col-span-2">Type</div>
              <div className="col-span-4 sm:col-span-3">Capacity</div>
              <div className="hidden sm:block sm:col-span-2 text-right">Current bid</div>
            </div>

            <div className="divide-y">
              {LIVE_CAPACITY.map((item) => (
                <Link
                  key={item.id}
                  href="/platform"
                  className="grid grid-cols-12 gap-3 px-4 py-4 items-center hover:bg-sky-50/50 transition-colors"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-neutral-900">{item.lane}</p>

                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.badge === "Hot"
                            ? "bg-rose-100 text-rose-700"
                            : item.badge === "Closing"
                            ? "bg-amber-100 text-amber-700"
                            : item.badge === "New"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {item.badge === "Hot" && <Flame className="mr-1 h-3 w-3" />}
                        {item.badge === "Closing" && <Clock3 className="mr-1 h-3 w-3" />}
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 mt-1">
                      {item.timeLeft} · {item.activity}
                    </p>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                      {item.type === "Transport" ? (
                        <Truck className="h-3.5 w-3.5" />
                      ) : (
                        <Warehouse className="h-3.5 w-3.5" />
                      )}
                      {item.type}
                    </span>
                  </div>

                  <div className="col-span-5 sm:col-span-3 text-sm text-neutral-600">
                    {item.capacity}
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-right">
                    <p className="font-semibold text-neutral-900">{item.bid}</p>
                    <p className="text-[11px] text-neutral-500 sm:hidden">Current bid</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How Froto helps */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Why Froto
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mt-1">
              Built for real-world logistics decisions
            </h2>
            <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
              Froto helps operators move faster when capacity is tight, sourcing is messy,
              and the real cost sits across both product and freight.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl border-sky-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-2xl bg-sky-100 flex items-center justify-center">
                  <PackageCheck className="h-5 w-5 text-sky-700" />
                </div>
                <CardTitle className="text-base mt-3">Find spare capacity fast</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600 space-y-2">
                <p>
                  Search available pallet, parcel and warehouse space without waiting on endless
                  calls and emails.
                </p>
                <p className="text-xs text-neutral-500">
                  Great for overflow stock, urgent runs, project freight and seasonal peaks.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-emerald-700" />
                </div>
                <CardTitle className="text-base mt-3">Run structured tenders</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600 space-y-2">
                <p>
                  Raise RFQs for product, warehousing and freight in one place, then compare
                  offers side by side.
                </p>
                <p className="text-xs text-neutral-500">
                  Better than comparing disconnected quotes with hidden extras buried in emails.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-amber-100 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-amber-700" />
                </div>
                <CardTitle className="text-base mt-3">Compare total landed cost</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600 space-y-2">
                <p>
                  See the real number by combining product, transport, storage and fees instead of
                  chasing cheapest line-item rates.
                </p>
                <p className="text-xs text-neutral-500">
                  Make better decisions across cost, service level and operational fit.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Logistics imagery strip */}
      <section className="pt-4 pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Image
              src="/images/truck.jpg"
              alt="Linehaul truck"
              width={900}
              height={520}
              className="rounded-2xl h-52 w-full object-cover shadow-sm"
            />
            <Image
              src="/images/warehouse.jpg"
              alt="3PL warehouse"
              width={900}
              height={520}
              className="rounded-2xl h-52 w-full object-cover shadow-sm"
            />
            <Image
              src="/images/distribution.jpg"
              alt="Distribution center"
              width={900}
              height={520}
              className="rounded-2xl h-52 w-full object-cover shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">
              How Froto works
            </h2>
            <p className="text-sm text-neutral-600 max-w-xl">
              Two ways to use Froto: ad-hoc auctions for spare capacity, and structured tenders for
              bigger sourcing decisions.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-700">
                  1
                </span>
                Post or find capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-600 space-y-2">
              <p>
                3PLs and carriers list spare pallet, square metre or parcel capacity on lanes and in
                warehouses. Shippers search by lane, location, temperature and timing.
              </p>
              <p className="text-[11px] text-neutral-500">
                Think &quot;ads&quot; but for pallets and parcels instead of products.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                  2
                </span>
                Bid or run a tender
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-600 space-y-2">
              <p>
                Use the marketplace to bid on one-off space. For bigger sourcing decisions,
                raise a tender across product + logistics and let suppliers compete.
              </p>
              <p className="text-[11px] text-neutral-500">
                Froto helps work out total landed cost, instead of comparing half-baked quotes.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-700">
                  3
                </span>
                Award, move, repeat
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-600 space-y-2">
              <p>
                Once you&apos;re happy with capacity and rate, you award the bid or tender and start
                moving freight.
              </p>
              <p className="text-[11px] text-neutral-500">
                In a full build, this is where payments, proof-of-delivery and scorecards plug in.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Split section */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border-sky-100 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100">
                    <Truck className="h-4 w-4 text-sky-700" />
                  </span>
                  Marketplace – ad-hoc auctions
                </CardTitle>
                <p className="text-xs text-neutral-500 mt-1">
                  Spare capacity, daily and weekly. Perfect for peaks, projects and last-minute space.
                </p>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-neutral-600 space-y-3">
              <ul className="space-y-2">
                <li>• Bid on pallet space in 3PL warehouses.</li>
                <li>• Bid on pallet or parcel space on scheduled runs.</li>
                <li>• See current bid, increments and time remaining.</li>
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-1 gap-1">
                <Link href="/platform">
                  Explore marketplace
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-emerald-100 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                    <Warehouse className="h-4 w-4 text-emerald-700" />
                  </span>
                  Tenders – structured sourcing
                </CardTitle>
                <p className="text-xs text-neutral-500 mt-1">
                  Multi-lane, multi-DC sourcing where you care about more than just price.
                </p>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-neutral-600 space-y-3">
              <ul className="space-y-2">
                <li>• Capture products, volumes and lanes in one place.</li>
                <li>• Suppliers submit product + logistics offers.</li>
                <li>• Compare total cost per scenario.</li>
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-1 gap-1">
                <Link href="/platform#tenders">
                  View tender demo
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
       {/* Trusted by operators */}
      <section className="py-10 bg-neutral-50 border-t">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Built for operators across the freight network
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              "3PL Warehouses",
              "Linehaul Carriers",
              "Retail DCs",
              "FMCG Brands",
              "Parcel Networks",
              "Procurement Teams",
            ].map((label) => (
              <div
                key={label}
                className="rounded-2xl border bg-white px-4 py-4 text-center text-sm font-medium text-neutral-700 shadow-sm"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col lg:flex-row items-center gap-6">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-neutral-900">
              Want Froto in your network?
            </h3>
            <p className="text-sm text-neutral-600 max-w-lg">
              Drop your work email and how you&apos;d use it – 3PL, carrier or shipper.
            </p>
          </div>
          <form className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
            <Input placeholder="you@company.com" />
            <Button type="button" className="whitespace-nowrap gap-1">
              Talk about Froto
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
              FR
            </span>
            <span>Froto — From ↔ To, made simple.</span>
          </div>
          <div className="flex gap-4">
            <span>Marketplace demo</span>
            <span>Tender demo</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
