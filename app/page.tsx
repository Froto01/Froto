"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  Truck,
  Warehouse,
} from "lucide-react";

import { LandingLiveMarketplace } from "@/components/landing-live-marketplace";
import { LandingMarketPulse } from "@/components/landing-market-pulse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OPERATORS = [
  "3PL Warehouses",
  "Linehaul Carriers",
  "Retail DCs",
  "FMCG Brands",
  "Parcel Networks",
  "Procurement Teams",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="relative overflow-hidden border-b border-froto-blue/10 bg-froto-ice">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(8,117,209,0.16),transparent_28%),radial-gradient(circle_at_82%_26%,rgba(16,169,155,0.18),transparent_26%),radial-gradient(circle_at_68%_92%,rgba(34,168,102,0.12),transparent_25%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[48%] lg:block">
          <Image
            src="/images/hero-truck.jpg"
            alt="Truck moving logistics capacity"
            fill
            priority
            className="object-cover opacity-18"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-froto-ice via-froto-ice/75 to-froto-ice/25" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-3 rounded-full border border-froto-blue/15 bg-white/85 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-froto-blue" />
                <span className="h-2 w-2 rounded-full bg-froto-teal" />
                <span className="h-2 w-2 rounded-full bg-froto-green" />
              </span>
              <span className="text-froto-navy">Early feedback preview · Connect. Match. Move.</span>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-froto-navy sm:text-5xl lg:text-6xl">
                Logistics capacity,
                <span className="block bg-gradient-to-r from-froto-blue via-froto-cyan to-froto-green bg-clip-text text-transparent">
                  matched in one marketplace.
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Froto connects shippers, carriers and 3PL warehouses so spare transport and storage
                capacity can be discovered, bid on and awarded with far less friction.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 rounded-xl bg-froto-navy px-6 hover:bg-[#0a356f]">
                <Link href="/platform">
                  Open marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl border-froto-blue/25 bg-white/70 text-froto-navy hover:bg-white"
              >
                <Link href="/platform#tenders">Explore tenders</Link>
              </Button>
            </div>

            <div className="grid max-w-2xl gap-3 text-sm text-slate-600 sm:grid-cols-3">
              {["Transport lanes", "Warehouse capacity", "Live company bidding"].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-froto-teal/15">
                    <CheckCircle2 className="h-3.5 w-3.5 text-froto-green" />
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-froto-blue/12 via-froto-cyan/8 to-froto-green/14 blur-2xl" />
            <Card className="relative overflow-hidden rounded-[2rem] border-froto-blue/15 bg-white/95 shadow-xl shadow-froto-navy/10 backdrop-blur">
              <div className="bg-gradient-to-r from-froto-navy via-[#0a4778] to-froto-teal px-6 py-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Froto market pulse</p>
                    <h2 className="mt-1 text-xl font-semibold">What the market is paying</h2>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
                    <BarChart3 className="h-5 w-5" />
                  </span>
                </div>
              </div>
              <LandingMarketPulse />
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-froto-blue">Live marketplace board</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-froto-navy">A freight board built for action</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Current open transport capacity, warehouse space, tenders and customer jobs. Commercially sensitive identities and sealed pricing stay inside the signed-in marketplace.
              </p>
            </div>

            <Button asChild variant="outline" className="gap-1 rounded-xl border-froto-blue/20 text-froto-navy">
              <Link href="/platform">
                View current listings
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <LandingLiveMarketplace />
        </div>
      </section>

      <section className="border-y border-froto-blue/10 bg-froto-ice py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-froto-teal">Why Froto</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-froto-navy">Built for real logistics decisions</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Less chasing, less disconnected quoting, and a clearer path from available capacity to an awarded outcome.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card className="rounded-[1.6rem] border-blue-100 bg-blue-50/65 shadow-sm">
              <CardHeader className="pb-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm"><PackageCheck className="h-5 w-5 text-froto-blue" /></span>
                <CardTitle className="mt-4 text-lg text-froto-navy">Find capacity faster</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">Search spare pallet, parcel and warehouse space without stitching together endless calls, spreadsheets and emails.</CardContent>
            </Card>

            <Card className="rounded-[1.6rem] border-cyan-100 bg-cyan-50/70 shadow-sm">
              <CardHeader className="pb-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm"><ClipboardList className="h-5 w-5 text-froto-teal" /></span>
                <CardTitle className="mt-4 text-lg text-froto-navy">Make competition visible</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">Use live bids for one-off capacity and structured tenders for larger sourcing events, with each offer easier to compare.</CardContent>
            </Card>

            <Card className="rounded-[1.6rem] border-emerald-100 bg-emerald-50/65 shadow-sm">
              <CardHeader className="pb-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm"><BarChart3 className="h-5 w-5 text-froto-green" /></span>
                <CardTitle className="mt-4 text-lg text-froto-navy">Move from quote to award</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">See price, capacity, timing and company activity in one workflow, then award the best fit and keep the transaction trail together.</CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[["/images/truck.jpg", "Linehaul truck"], ["/images/warehouse.jpg", "3PL warehouse"], ["/images/distribution.jpg", "Distribution centre"]].map(([src, alt], index) => (
              <div key={src} className={`overflow-hidden rounded-[1.6rem] shadow-md shadow-froto-navy/10 ring-1 ${index === 0 ? "ring-blue-100" : index === 1 ? "ring-cyan-100" : "ring-emerald-100"}`}>
                <Image src={src} alt={alt} width={900} height={520} className="h-56 w-full object-cover transition-transform duration-500 hover:scale-[1.025]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-froto-blue">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-froto-navy">Connect the network. Match the need. Move the freight.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { number: "1", title: "Connect", text: "Carriers and 3PLs publish capacity. Shippers search by lane, location, temperature and timing.", color: "bg-blue-100 text-froto-blue" },
              { number: "2", title: "Match", text: "Companies bid on suitable capacity or respond to tenders, making options easier to compare in one place.", color: "bg-cyan-100 text-froto-teal" },
              { number: "3", title: "Move", text: "Bidding closes, the owner awards the winning offer, and both companies have a clear transaction record.", color: "bg-emerald-100 text-froto-green" },
            ].map((step) => (
              <Card key={step.title} className="rounded-[1.6rem] border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${step.color}`}>{step.number}</span>
                  <CardTitle className="mt-4 text-xl text-froto-navy">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-slate-600">{step.text}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-froto-blue/10 bg-slate-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-2">
          <Card className="overflow-hidden rounded-[1.75rem] border-blue-100 shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-froto-navy to-froto-blue" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg text-froto-navy"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50"><Truck className="h-5 w-5 text-froto-blue" /></span>Marketplace capacity</CardTitle>
              <p className="text-sm leading-6 text-slate-600">Spare transport and warehouse capacity for peaks, projects, urgent moves and unused network space.</p>
            </CardHeader>
            <CardContent><Button asChild variant="outline" className="gap-1 rounded-xl border-froto-blue/20 text-froto-navy"><Link href="/platform">Explore marketplace<ArrowRight className="h-4 w-4" /></Link></Button></CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.75rem] border-emerald-100 shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-froto-teal to-froto-green" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg text-froto-navy"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50"><Warehouse className="h-5 w-5 text-froto-green" /></span>Structured tenders</CardTitle>
              <p className="text-sm leading-6 text-slate-600">Larger sourcing events that bring product, logistics and total landed cost into a more structured comparison.</p>
            </CardHeader>
            <CardContent><Button asChild variant="outline" className="gap-1 rounded-xl border-emerald-200 text-froto-navy"><Link href="/platform#tenders">View tenders<ArrowRight className="h-4 w-4" /></Link></Button></CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Built for operators across the freight network</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {OPERATORS.map((label, index) => (
              <div key={label} className={`rounded-2xl border px-4 py-4 text-center text-sm font-semibold text-froto-navy shadow-sm ${index % 3 === 0 ? "border-blue-100 bg-blue-50/60" : index % 3 === 1 ? "border-cyan-100 bg-cyan-50/55" : "border-emerald-100 bg-emerald-50/55"}`}>{label}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-14">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-froto-navy via-[#094978] to-froto-teal px-6 py-10 text-white shadow-xl shadow-froto-navy/15 sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Connect. Match. Move.</p>
              <h3 className="mt-2 text-2xl font-semibold">Put your logistics network into motion.</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Explore the marketplace, create a company profile and see how Froto turns capacity into a live, competitive workflow.</p>
            </div>
            <Button asChild size="lg" className="rounded-xl bg-white text-froto-navy hover:bg-cyan-50"><Link href="/auth-test">Try Froto<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-froto-blue/10 bg-froto-ice">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-7 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/brand/froto-mark.svg" alt="Froto" width={34} height={34} className="h-8 w-8" />
            <div><p className="text-sm font-semibold text-froto-navy">Froto</p><p className="text-xs text-slate-500">Connect. Match. Move.</p></div>
          </div>
          <div className="flex gap-5 text-xs font-medium text-slate-500">
            <Link href="/platform" className="hover:text-froto-blue">Marketplace</Link>
            <Link href="/platform#tenders" className="hover:text-froto-teal">Tenders</Link>
            <Link href="/auth-test" className="hover:text-froto-green">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
