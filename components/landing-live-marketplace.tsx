"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ClipboardList, Clock3, Package, Truck, Warehouse } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type PublicMarketplaceItem = {
  id: string;
  href: string;
  type: "Transport" | "Warehouse" | "Tender" | "Customer job";
  title: string;
  detail: string;
  closesAt: string | null;
  activityCount: number;
  activityLabel: string;
  createdAt: string;
};

type PublicMarketplaceFeed = {
  openCount: number;
  items: PublicMarketplaceItem[];
};

function timeLabel(value: string | null) {
  if (!value) return "Open";
  const remaining = new Date(value).getTime() - Date.now();
  if (remaining <= 0) return "Closing";
  const minutes = Math.max(1, Math.floor(remaining / 60000));
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m left`;
  return `${Math.floor(hours / 24)}d left`;
}

function TypeIcon({ type }: { type: PublicMarketplaceItem["type"] }) {
  if (type === "Warehouse") return <Warehouse className="h-3.5 w-3.5 text-froto-teal" />;
  if (type === "Tender") return <ClipboardList className="h-3.5 w-3.5 text-froto-green" />;
  if (type === "Customer job") return <Package className="h-3.5 w-3.5 text-froto-blue" />;
  return <Truck className="h-3.5 w-3.5 text-froto-blue" />;
}

export function LandingLiveMarketplace({ compact = false }: { compact?: boolean }) {
  const [feed, setFeed] = useState<PublicMarketplaceFeed>({ openCount: 0, items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/public-marketplace", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as PublicMarketplaceFeed;
        if (!cancelled) setFeed(payload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const items = useMemo(() => feed.items.slice(0, compact ? 3 : 8), [feed.items, compact]);

  if (compact) {
    return (
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs ring-1 ring-emerald-100">
          <span className="font-semibold text-emerald-800">Live marketplace activity</span>
          <Badge className="bg-froto-green text-white">{feed.openCount} open</Badge>
        </div>
        {loading ? <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Loading current opportunities...</p> : null}
        {!loading && items.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">No open opportunities right now. New marketplace activity will appear here automatically.</p> : null}
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-froto-blue/20 hover:bg-froto-ice/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-froto-navy">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail} · {timeLabel(item.closesAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-froto-teal">{item.type}</p>
                <p className="mt-1 text-[11px] text-slate-500">{item.activityLabel}</p>
              </div>
            </div>
          </Link>
        ))}
        <Link href="/platform" className="flex items-center justify-center gap-2 rounded-xl bg-froto-ice px-4 py-3 text-sm font-semibold text-froto-navy transition-colors hover:bg-cyan-50">
          View current marketplace
          <ArrowUpRight className="h-4 w-4 text-froto-blue" />
        </Link>
      </CardContent>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-froto-blue/15 bg-white shadow-lg shadow-froto-navy/5">
      <div className="flex flex-col gap-2 bg-froto-navy px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Live Froto marketplace</p>
          <p className="text-sm font-semibold">Current public opportunity activity</p>
        </div>
        <Badge className="w-fit bg-froto-green text-white hover:bg-froto-green">{feed.openCount} open opportunities</Badge>
      </div>
      <div className="grid grid-cols-12 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <div className="col-span-5">Lane / opportunity</div>
        <div className="col-span-3 sm:col-span-2">Type</div>
        <div className="col-span-4 sm:col-span-3">Details</div>
        <div className="hidden text-right sm:col-span-2 sm:block">Activity</div>
      </div>
      <div className="divide-y divide-slate-100">
        {loading ? <div className="px-5 py-6 text-sm text-slate-500">Loading live marketplace activity...</div> : null}
        {!loading && items.length === 0 ? <div className="px-5 py-6 text-sm text-slate-500">No open opportunities right now. The board will populate automatically as new work and capacity are posted.</div> : null}
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="grid grid-cols-12 items-center gap-3 px-5 py-4 transition-colors hover:bg-froto-ice">
            <div className="col-span-12 sm:col-span-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-froto-navy">{item.title}</p>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Live</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{timeLabel(item.closesAt)}</p>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-froto-ice px-2.5 py-1 text-xs font-medium text-froto-navy"><TypeIcon type={item.type} />{item.type}</span>
            </div>
            <div className="col-span-5 text-sm text-slate-600 sm:col-span-3">{item.detail}</div>
            <div className="col-span-3 text-right sm:col-span-2">
              <p className="font-semibold text-froto-navy">{item.activityLabel}</p>
              <p className="text-[11px] text-slate-400 sm:hidden">Activity</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
