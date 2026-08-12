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
    },
    {
      label: "Active bids",
      value: DEMO_BIDS.length,
      detail: "Demo bid room activity",
      icon: BarChart3,
    },
    {
      label: "Open tenders",
      value: MOCK_TENDERS.length,
      detail: "Sourcing events in progress",
      icon: ClipboardList,
    },
    {
      label: "Tender value",
      value: formatAUD(tenderValue),
      detail: "Product plus logistics",
      icon: RadioTower,
    },
    {
      label: "Capacity saved",
      value: `${capacitySaved} spots`,
      detail: "Across demo listings",
      icon: Warehouse,
    },
  ];

  const recentActivity = [
    "Carrier A placed a new demo bid",
    "Brisbane chilled capacity was added to watchlist",
    "FMCG East Coast tender is open for supplier responses",
    "Sydney dry storage listing is still accepting bids",
  ];

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
                     
  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
    Froto dashboard
  </p>

  <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
    {company.name}
  </h1>

  <div className="mt-2 flex items-center gap-2">
    <Badge variant="outline">{membership.role}</Badge>
    <span className="text-sm text-neutral-500">
      Marketplace overview
    </span>
  </div>
</div>

  

          <div className="flex flex-col gap-2 sm:flex-row">
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
            <Button asChild variant="outline" className="gap-2">
              <Link href="/platform">
                <ArrowLeft className="h-4 w-4" />
                Back to platform
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <Card key={metric.label} className="rounded-2xl shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-neutral-900">
                        {metric.value}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                      <Icon className="h-4 w-4 text-sky-700" />
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    {metric.detail}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity}
                  className="rounded-2xl border bg-white px-4 py-3 text-sm text-neutral-700"
                >
                  {activity}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Suggested capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {LOGISTICS_LISTINGS.slice(0, 2).map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-2xl border bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {listing.name}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {listing.capacity}
                      </p>
                    </div>
                    <Badge variant="outline">{listing.type}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-sky-700" />
                My active bids
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEMO_BIDS.map((bid) => (
                <div
                  key={`${bid.bidder}-${bid.amount}`}
                  className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{bid.bidder}</p>
                    <p className="text-xs text-neutral-500">{bid.time}</p>
                  </div>
                  <p className="font-semibold text-neutral-900">
                    {formatAUD(bid.amount)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-emerald-700" />
                My tenders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_TENDERS.map((tender) => (
                <div
                  key={tender.id}
                  className="rounded-2xl border bg-white px-4 py-3"
                >
                  <p className="font-medium text-neutral-900">{tender.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Value:{" "}
                    {formatAUD(tender.productCost + tender.logisticsCost)}
                  </p>
                </div>
              ))}
              <Button asChild variant="outline" className="w-full">
                <Link href="/platform/tenders/new">Create another tender</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bookmark className="h-5 w-5 text-amber-700" />
                Watched listings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {LOGISTICS_LISTINGS.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/platform/listing/${listing.id}`}
                  className="block rounded-2xl border bg-white px-4 py-3 transition-colors hover:bg-sky-50/50"
                >
                  <div className="flex items-start gap-3">
                    {listing.type === "Transport Lane" ? (
                      <Truck className="mt-0.5 h-4 w-4 text-sky-700" />
                    ) : (
                      <Warehouse className="mt-0.5 h-4 w-4 text-sky-700" />
                    )}
                    <div>
                      <p className="font-medium text-neutral-900">
                        {listing.name}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {listing.location}
                      </p>
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
