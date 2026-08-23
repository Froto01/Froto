"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, LayoutDashboard, PackageSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GuestAuction = {
  id: string;
  title: string;
  pickupLocation: string;
  deliveryLocation: string;
  auctionClosesAt: string;
  status?: string;
  bidCount?: number;
};

type GuestAuctionResponse = {
  viewerType: "GUEST_OWNER" | "COMPANY_BIDDER";
  auctions: GuestAuction[];
};

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [guestData, setGuestData] = useState<GuestAuctionResponse | null>(null);

  useEffect(() => {
    if (pathname !== "/platform") return;

    let cancelled = false;
    void fetch("/api/guest-auctions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as GuestAuctionResponse;
      })
      .then((data) => {
        if (!cancelled && data?.viewerType === "GUEST_OWNER") setGuestData(data);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <>
      {pathname === "/platform" && guestData?.viewerType === "GUEST_OWNER" ? (
        <div className="bg-gradient-to-b from-froto-ice to-transparent px-4 pt-6">
          <div className="mx-auto max-w-6xl">
            <Card className="rounded-[1.6rem] border-cyan-100 bg-white shadow-md shadow-froto-navy/5">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-froto-blue" /><p className="font-semibold text-froto-navy">Your transport requests</p></div>
                    <p className="mt-1 text-sm text-slate-500">Your guest jobs stay visible here while you browse the Froto marketplace.</p>
                  </div>
                  <Button asChild variant="outline" className="gap-2"><Link href="/platform/guest-dashboard"><LayoutDashboard className="h-4 w-4" />Guest dashboard</Link></Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {guestData.auctions.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No transport requests posted yet.</div>
                  ) : guestData.auctions.slice(0, 4).map((auction) => (
                    <Link key={auction.id} href={`/platform/guest-auctions/${auction.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-froto-blue/20 hover:bg-blue-50/30">
                      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-froto-navy">{auction.title}</p><p className="mt-1 text-sm text-slate-500">{auction.pickupLocation} → {auction.deliveryLocation}</p></div><Badge className={auction.status === "AWARDED" ? "bg-emerald-600 text-white" : "bg-froto-navy text-white"}>{auction.status ?? "OPEN"}</Badge></div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{auction.bidCount ?? 0} offer{auction.bidCount === 1 ? "" : "s"}</span><span className="flex items-center gap-1 font-medium text-froto-blue">Open request <ArrowRight className="h-3.5 w-3.5" /></span></div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
