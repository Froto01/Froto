"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useParams } from "next/navigation";

type Detail = {
  viewerType: "GUEST_OWNER" | "COMPANY_BIDDER";
  privacy: string;
  auction: {
    id: string;
    title: string;
    itemDescription: string;
    pickupLocation: string;
    deliveryLocation: string;
    pickupDate: string | null;
    deliveryBy: string | null;
    auctionClosesAt: string;
    notes: string | null;
    status: string;
    bidCount?: number;
    awardedBidId?: string | null;
    awardedAt: string | null;
  };
  ownBid: { id: string; amount: number; serviceDescription: string | null; leadTime: string | null; notes: string | null; status: string } | null;
};

type OwnerBid = {
  id: string;
  amount: number;
  serviceDescription: string | null;
  leadTime: string | null;
  notes: string | null;
  status: string;
  awarded: boolean;
  company: { id: string; name: string; verified: boolean; ratingAverage: number | null; reviewCount: number; completedJobs: number };
};

export default function GuestAuctionDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [ownerBids, setOwnerBids] = useState<OwnerBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/guest-auctions/${params.id}`, { cache: "no-store" });
      const payload = (await response.json()) as Detail & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Guest job could not be loaded.");
      setDetail(payload);
      if (payload.viewerType === "GUEST_OWNER") {
        const bidsResponse = await fetch(`/api/guest-auctions/${params.id}/bids`, { cache: "no-store" });
        const bidsPayload = (await bidsResponse.json()) as { bids?: OwnerBid[]; error?: string };
        if (!bidsResponse.ok) throw new Error(bidsPayload.error ?? "Bids could not be loaded.");
        setOwnerBids(bidsPayload.bids ?? []);
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Guest job could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  async function submitBid() {
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/guest-auctions/${params.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), serviceDescription, leadTime, notes }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Bid could not be submitted.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bid could not be submitted.");
    } finally { setSaving(false); }
  }

  async function awardBid(bidId: string) {
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/guest-auctions/${params.id}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Bid could not be awarded.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bid could not be awarded.");
    } finally { setSaving(false); }
  }

  if (loading) return <main className="min-h-screen bg-froto-ice p-8 text-slate-500">Loading guest job...</main>;
  if (!detail) return <main className="min-h-screen bg-froto-ice p-8 text-red-700">{error ?? "Guest job not found."}</main>;

  const closed = new Date(detail.auction.auctionClosesAt).getTime() <= Date.now();

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-6xl px-4 py-7">
        <Button asChild variant="outline" className="mb-6 gap-2"><Link href="/platform/guest-auctions"><ArrowLeft className="h-4 w-4" />Guest auctions</Link></Button>
        {error ? <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-[1.8rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
            <CardHeader><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-blue">Guest transport job</p><CardTitle className="mt-1 text-2xl text-froto-navy">{detail.auction.title}</CardTitle></div><Badge className="bg-froto-navy text-white">{detail.auction.status}</Badge></div></CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-froto-navy">{detail.auction.pickupLocation} → {detail.auction.deliveryLocation}</p><p className="mt-2 leading-6">{detail.auction.itemDescription}</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">Pickup</span><p className="mt-1 font-medium text-froto-navy">{detail.auction.pickupDate ? new Date(detail.auction.pickupDate).toLocaleDateString("en-AU") : "Flexible"}</p></div><div className="rounded-xl border p-3"><span className="text-xs text-slate-500">Auction closes</span><p className="mt-1 font-medium text-froto-navy">{new Date(detail.auction.auctionClosesAt).toLocaleString("en-AU")}</p></div></div>
              {detail.auction.notes ? <p className="rounded-xl border border-slate-200 p-3">{detail.auction.notes}</p> : null}
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-800"><LockKeyhole className="h-4 w-4" /><span>Sealed bidding: companies cannot see competitor offers.</span></div>
            </CardContent>
          </Card>

          {detail.viewerType === "GUEST_OWNER" ? (
            <Card className="rounded-[1.8rem] border-amber-200 bg-white shadow-lg shadow-froto-navy/5"><CardHeader><CardTitle className="text-froto-navy">Compare company offers</CardTitle><p className="text-sm text-slate-500">Choose using price, verification and proven Froto reputation.</p></CardHeader><CardContent className="space-y-4">{ownerBids.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No company bids yet.</p> : ownerBids.map((bid) => <div key={bid.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/platform/companies/${bid.company.id}`} className="font-semibold text-froto-navy hover:underline">{bid.company.name}</Link>{bid.company.verified ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="mr-1 h-3 w-3" />Verified</Badge> : null}</div><p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{bid.company.ratingAverage?.toFixed(1) ?? "No rating"} · {bid.company.reviewCount} verified review{bid.company.reviewCount === 1 ? "" : "s"} · {bid.company.completedJobs} completed jobs</p></div><p className="text-2xl font-semibold text-froto-blue">${bid.amount.toLocaleString("en-AU")}</p></div>{bid.serviceDescription ? <p className="mt-3 text-sm text-slate-700">{bid.serviceDescription}</p> : null}{bid.leadTime ? <p className="mt-2 text-sm text-slate-500">Timing: {bid.leadTime}</p> : null}<div className="mt-4 flex items-center justify-between gap-3"><Badge className={bid.awarded ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}>{bid.awarded ? "Selected winner" : bid.status}</Badge>{detail.auction.status === "OPEN" && closed ? <Button disabled={saving} onClick={() => void awardBid(bid.id)} className="bg-froto-navy hover:bg-[#0a356f]">Award this company</Button> : null}</div></div>)}</CardContent></Card>
          ) : (
            <Card className="rounded-[1.8rem] border-froto-teal/10 bg-white shadow-lg shadow-froto-navy/5"><CardHeader><CardTitle className="text-froto-navy">Your sealed bid</CardTitle><p className="text-sm text-slate-500">Only the guest customer can compare all bids.</p></CardHeader><CardContent>{detail.ownBid ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5"><p className="text-sm text-slate-500">Your submitted offer</p><p className="mt-1 text-3xl font-semibold text-froto-navy">${detail.ownBid.amount.toLocaleString("en-AU")}</p><Badge className="mt-3 bg-froto-navy text-white">{detail.ownBid.status}</Badge>{detail.ownBid.serviceDescription ? <p className="mt-3 text-sm text-slate-700">{detail.ownBid.serviceDescription}</p> : null}</div> : !closed && detail.auction.status === "OPEN" ? <div className="space-y-4"><Input type="number" min="1" step="0.01" placeholder="Your total price (AUD)" value={amount} onChange={(e) => setAmount(e.target.value)} /><textarea rows={4} placeholder="Describe your service and what's included" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" /><Input placeholder="Lead time / timing" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} /><textarea rows={3} placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" /><Button disabled={saving || !amount} onClick={() => void submitBid()} className="w-full bg-froto-navy hover:bg-[#0a356f]">{saving ? "Submitting..." : "Submit sealed bid"}</Button></div> : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Bidding is closed for this guest job.</p>}</CardContent></Card>
          )}
        </div>
      </div>
    </main>
  );
}
