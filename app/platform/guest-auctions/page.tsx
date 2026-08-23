"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, PackagePlus, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type GuestAuctionList = {
  viewerType: "GUEST_OWNER" | "COMPANY_BIDDER";
  auctions: Array<{
    id: string;
    title: string;
    itemDescription?: string;
    pickupLocation: string;
    deliveryLocation: string;
    auctionClosesAt: string;
    status?: string;
    bidCount?: number;
    ownBid?: { amount: number; status: string } | null;
  }>;
};

export default function GuestAuctionsPage() {
  const [data, setData] = useState<GuestAuctionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    itemDescription: "",
    pickupLocation: "",
    deliveryLocation: "",
    pickupDate: "",
    deliveryBy: "",
    auctionClosesAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/guest-auctions", { cache: "no-store" });
      const payload = (await response.json()) as GuestAuctionList & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Guest auctions could not be loaded.");
      setData(payload);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Guest auctions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createAuction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/guest-auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Guest job could not be posted.");
      setForm({ title: "", itemDescription: "", pickupLocation: "", deliveryLocation: "", pickupDate: "", deliveryBy: "", auctionClosesAt: "", notes: "" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Guest job could not be posted.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-froto-ice p-8 text-slate-500">Loading guest auctions...</main>;
  if (!data) return <main className="min-h-screen bg-froto-ice p-8 text-red-700">{error ?? "Guest auctions could not be loaded."}</main>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-6xl px-4 py-7">
        <Button asChild variant="outline" className="mb-6 gap-2"><Link href="/platform"><ArrowLeft className="h-4 w-4" />Back to marketplace</Link></Button>

        <Card className="overflow-hidden rounded-[2rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
          <div className="bg-gradient-to-r from-froto-navy via-froto-blue to-froto-teal px-6 py-6 text-white">
            <div className="flex items-center gap-3"><LockKeyhole className="h-6 w-6" /><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Silent auction</p><h1 className="text-2xl font-semibold">Guest transport jobs</h1></div></div>
            <p className="mt-3 max-w-2xl text-sm text-white/80">Companies submit sealed offers. Bidders never see competitor pricing; the customer compares offers using price, verification and Froto reputation.</p>
          </div>
        </Card>

        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        {data.viewerType === "GUEST_OWNER" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-[1.7rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
              <CardHeader><CardTitle className="flex items-center gap-2 text-froto-navy"><PackagePlus className="h-5 w-5 text-froto-blue" />Post a transport job</CardTitle></CardHeader>
              <CardContent><form onSubmit={createAuction} className="space-y-4">
                <Input required placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <textarea required rows={4} placeholder="Describe the item(s), size, weight and handling needs" value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                <div className="grid gap-3 sm:grid-cols-2"><Input required placeholder="Pickup location" value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} /><Input required placeholder="Delivery location" value={form.deliveryLocation} onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })} /></div>
                <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-600">Pickup date<Input type="date" value={form.pickupDate} onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} /></label><label className="text-sm text-slate-600">Deliver by<Input type="date" value={form.deliveryBy} onChange={(e) => setForm({ ...form, deliveryBy: e.target.value })} /></label></div>
                <label className="block text-sm text-slate-600">Auction closes<Input required type="datetime-local" value={form.auctionClosesAt} onChange={(e) => setForm({ ...form, auctionClosesAt: e.target.value })} /></label>
                <textarea rows={3} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                <Button disabled={saving} className="w-full bg-froto-navy hover:bg-[#0a356f]">{saving ? "Posting..." : "Post silent-auction job"}</Button>
              </form></CardContent>
            </Card>

            <AuctionCards data={data} owner />
          </div>
        ) : (
          <div className="mt-6"><AuctionCards data={data} owner={false} /></div>
        )}
      </div>
    </main>
  );
}

function AuctionCards({ data, owner }: { data: GuestAuctionList; owner: boolean }) {
  return <Card className="rounded-[1.7rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5"><CardHeader><CardTitle className="flex items-center gap-2 text-froto-navy"><Truck className="h-5 w-5 text-froto-teal" />{owner ? "My guest jobs" : "Open guest jobs"}</CardTitle></CardHeader><CardContent className="space-y-3">{data.auctions.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No guest auctions available yet.</p> : data.auctions.map((auction) => <Link key={auction.id} href={`/platform/guest-auctions/${auction.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-froto-blue/20 hover:bg-blue-50/30"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-froto-navy">{auction.title}</p><p className="mt-1 text-sm text-slate-500">{auction.pickupLocation} → {auction.deliveryLocation}</p></div><Badge className="bg-froto-navy text-white">{owner ? auction.status ?? "OPEN" : "SEALED"}</Badge></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span>Closes {new Date(auction.auctionClosesAt).toLocaleString("en-AU")}</span>{owner ? <span>{auction.bidCount ?? 0} bid{auction.bidCount === 1 ? "" : "s"}</span> : auction.ownBid ? <span>Your bid ${auction.ownBid.amount.toLocaleString("en-AU")}</span> : <span>No bid submitted</span>}</div></Link>)}</CardContent></Card>;
}
