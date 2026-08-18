import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

import {
  ArrowLeft,
  BarChart3,
  Bookmark,
  ClipboardList,
  PackageCheck,
  Plus,
  RadioTower,
  Truck,
  UserPlus,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_BIDS, LOGISTICS_LISTINGS, MOCK_TENDERS } from "@/lib/mock-data";

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCapacityNumber(capacity: string) {
  return Number(capacity.match(/\d+/)?.[0] || 0);
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth-test");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      companies: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/user-sync");
  }

  const membership = user.companies[0];

  if (!membership) {
    redirect("/company/new");
  }

  const company = membership.company;
  const tenderValue = MOCK_TENDERS.reduce(
    (total, tender) => total + tender.productCost + tender.logisticsCost,
    0
  );

  const capacitySaved = LOGISTICS_LISTINGS.reduce(
    (total, listing) => total + getCapacityNumber(listing.capacity),
    0
  );

  const metrics = [
    {
      label: "Active listings",
      value: LOGISTICS_LISTINGS.length,
      detail: "Live marketplace options",
      icon: PackageCheck,
      tone: "blue",
    },
    {
      label: "Active bids",
      value: DEMO_BIDS.length,
      detail: "Demo bid room activity",
      icon: BarChart3,
      tone: "teal",
    },
    {
      label: "Open tenders",
      value: MOCK_TENDERS.length,
      detail: "Sourcing events in progress",
      icon: ClipboardList,
      tone: "green",
    },
    {
      label: "Tender value",
      value: formatAUD(tenderValue),
      detail: "Product plus logistics",
      icon: RadioTower,
      tone: "cyan",
    },
    {
      label: "Capacity saved",
      value: `${capacitySaved} spots`,
      detail: "Across demo listings",
      icon: Warehouse,
      tone: "navy",
    },
  ];

  const toneClasses: Record<string, string> = {
    blue: "bg-blue-50 text-froto-blue ring-blue-100",
    teal: "bg-teal-50 text-froto-teal ring-teal-100",
    green: "bg-emerald-50 text-froto-green ring-emerald-100",
    cyan: "bg-cyan-50 text-froto-cyan ring-cyan-100",
    navy: "bg-slate-100 text-froto-navy ring-slate-200",
  };

  const recentActivity = [
    "Carrier A placed a new demo bid",
    "Brisbane chilled capacity was added to watchlist",
    "FMCG East Coast tender is open for supplier responses",
    "Sydney dry storage listing is still accepting bids",
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/froto-mark.svg"
              alt="Froto"
              width={54}
              height={54}
              className="h-12 w-12 rounded-2xl bg-froto-ice p-2 ring-1 ring-froto-blue/10"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">
                Froto dashboard
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">
                {company.name}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="border border-froto-teal/15 bg-teal-50 text-froto-teal hover:bg-teal-50">
                  {membership.role}
                </Badge>
                <span className="text-sm text-slate-500">Marketplace overview</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              variant="outline"
              className="gap-2 border-froto-blue/15 bg-white text-froto-navy"
            >
              <Link href="/platform/listings/new">
                <Plus className="h-4 w-4 text-froto-blue" />
                Create Listing
              </Link>
            </Button>
            <Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]">
              <Link href="/platform/onboarding">
                <UserPlus className="h-4 w-4" />
                Company Profile
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="gap-2 border-froto-teal/15 bg-white text-froto-navy"
            >
              <Link href="/platform">
                <ArrowLeft className="h-4 w-4 text-froto-teal" />
                Marketplace
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <Card
                key={metric.label}
                className="rounded-[1.4rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-froto-navy">
                        {metric.value}
                      </p>
                    </div>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${toneClasses[metric.tone]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{metric.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-blue">
                    Network pulse
                  </p>
                  <CardTitle className="mt-1 text-xl text-froto-navy">Recent activity</CardTitle>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-froto-blue">
                  <RadioTower className="h-4 w-4" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={activity}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-700"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      index % 3 === 0
                        ? "bg-froto-blue"
                        : index % 3 === 1
                          ? "bg-froto-teal"
                          : "bg-froto-green"
                    }`}
                  />
                  {activity}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-teal">
                    Capacity match
                  </p>
                  <CardTitle className="mt-1 text-xl text-froto-navy">Suggested capacity</CardTitle>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-froto-teal">
                  <Truck className="h-4 w-4" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {LOGISTICS_LISTINGS.slice(0, 2).map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-2xl border border-froto-teal/10 bg-teal-50/35 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-froto-navy">{listing.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{listing.capacity}</p>
                    </div>
                    <Badge className="border border-froto-teal/15 bg-white text-froto-teal hover:bg-white">
                      {listing.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-froto-navy">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-froto-blue">
                  <BarChart3 className="h-4 w-4" />
                </span>
                My active bids
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_BIDS.map((bid) => (
                <div
                  key={`${bid.bidder}-${bid.amount}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-froto-navy">{bid.bidder}</p>
                    <p className="text-xs text-slate-500">{bid.time}</p>
                  </div>
                  <p className="font-semibold text-froto-blue">{formatAUD(bid.amount)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-froto-green/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-froto-navy">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-froto-green">
                  <ClipboardList className="h-4 w-4" />
                </span>
                My tenders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_TENDERS.map((tender) => (
                <div
                  key={tender.id}
                  className="rounded-2xl border border-froto-green/10 bg-emerald-50/35 px-4 py-3"
                >
                  <p className="font-medium text-froto-navy">{tender.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Value: {formatAUD(tender.productCost + tender.logisticsCost)}
                  </p>
                </div>
              ))}
              <Button
                asChild
                variant="outline"
                className="w-full border-froto-green/15 text-froto-navy"
              >
                <Link href="/platform/tenders/new">Create another tender</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-froto-navy">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-froto-teal">
                  <Bookmark className="h-4 w-4" />
                </span>
                Watched listings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {LOGISTICS_LISTINGS.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/platform/listing/${listing.id}`}
                  className="block rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 transition-colors hover:border-froto-teal/20 hover:bg-teal-50/50"
                >
                  <div className="flex items-start gap-3">
                    {listing.type === "Transport Lane" ? (
                      <Truck className="mt-0.5 h-4 w-4 text-froto-blue" />
                    ) : (
                      <Warehouse className="mt-0.5 h-4 w-4 text-froto-teal" />
                    )}
                    <div>
                      <p className="font-medium text-froto-navy">{listing.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{listing.location}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
