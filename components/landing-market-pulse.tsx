"use client";

import { useEffect, useState } from "react";
import { BarChart3, Minus, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";

type Benchmark = {
  label: string;
  type: "Transport lane" | "3PL warehouse";
  unit: "shipment" | "pallet / week";
  sampleCount: number;
  minimumSample: number;
  status: "READY" | "BUILDING";
  medianRate: number | null;
  trendPercent: number | null;
};

type MarketPulsePayload = {
  periodDays: number;
  methodology: string;
  minimumSample: number;
  benchmarks: Benchmark[];
};

function formatRate(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function Trend({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
        <Minus className="h-3 w-3" /> trend building
      </span>
    );
  }

  if (Math.abs(value) < 0.5) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <Minus className="h-3 w-3" /> stable
      </span>
    );
  }

  const rising = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
        rising ? "text-amber-700" : "text-emerald-700"
      }`}
    >
      {rising ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {rising ? "+" : ""}{value}% vs prior 30d
    </span>
  );
}

export function LandingMarketPulse() {
  const [payload, setPayload] = useState<MarketPulsePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/public-market-pulse", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as MarketPulsePayload;
        if (!cancelled) setPayload(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const benchmarks = payload?.benchmarks ?? [];

  return (
    <CardContent className="space-y-3 p-5">
      <div className="flex items-center justify-between rounded-xl bg-cyan-50 px-3 py-2 text-xs ring-1 ring-cyan-100">
        <span className="inline-flex items-center gap-2 font-semibold text-froto-navy">
          <BarChart3 className="h-4 w-4 text-froto-teal" />
          Awarded market rates · rolling 30 days
        </span>
        <Badge className="bg-froto-navy text-white hover:bg-froto-navy">Median</Badge>
      </div>

      {loading ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
          Building the latest market view...
        </p>
      ) : null}

      {!loading && benchmarks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
          <p className="font-semibold text-froto-navy">Building market data</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Froto will publish a benchmark once at least 3 comparable completed awards exist in a 30-day window.
          </p>
        </div>
      ) : null}

      {benchmarks.map((item) => (
        <div key={`${item.type}-${item.label}`} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-froto-navy">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.type} · {item.sampleCount} completed award{item.sampleCount === 1 ? "" : "s"}</p>
            </div>
            <div className="shrink-0 text-right">
              {item.status === "READY" && item.medianRate !== null ? (
                <>
                  <p className="font-semibold text-slate-900">{formatRate(item.medianRate)}</p>
                  <p className="text-[11px] text-slate-500">/ {item.unit}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-froto-teal">Building market data</p>
                  <p className="text-[11px] text-slate-400">{item.sampleCount}/{item.minimumSample} comparable</p>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Trend value={item.status === "READY" ? item.trendPercent : null} />
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck className="h-3 w-3" /> aggregated only
            </span>
          </div>
        </div>
      ))}

      <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-4 text-slate-500">
        Froto Market Pulse uses completed awarded transactions only. Individual companies, customers and sealed prices are never shown.
      </p>
    </CardContent>
  );
}
