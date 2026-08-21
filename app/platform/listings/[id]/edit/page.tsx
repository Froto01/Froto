"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CirclePause, CirclePlay, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ListingForm = {
  listingType: "Transport Lane" | "Warehouse Space";
  title: string;
  location: string;
  origin: string;
  destination: string;
  capacityAmount: string;
  capacityUnit: "pallets" | "parcels" | "sqm" | "cbm";
  temperatureClass: "ambient" | "chilled" | "frozen" | "dangerous goods" | "other";
  availableFrom: string;
  availableTo: string;
  startingBid: string;
  minimumBidIncrement: string;
  biddingClosesAt: string;
  notes: string;
};

type ListingResponse = {
  id: string;
  listingType: string;
  title: string;
  location: string | null;
  origin: string | null;
  destination: string | null;
  capacityAmount: number;
  capacityUnit: string;
  temperatureClass: string;
  availableFrom: string;
  availableTo: string;
  startingBid: number;
  minimumBidIncrement: number;
  biddingClosesAt: string | null;
  bidCount: number;
  status: string;
  isOwner: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canPause: boolean;
  canReopen: boolean;
  notes: string | null;
};

const fieldClass =
  "border-froto-blue/15 bg-white focus-visible:border-froto-blue focus-visible:ring-froto-blue/20";
const selectClass =
  "h-9 w-full rounded-md border border-froto-blue/15 bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-froto-blue focus-visible:ring-[3px] focus-visible:ring-froto-blue/20";

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<ListingForm | null>(null);
  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/listings/${params.id}`, { cache: "no-store" });
        const data = (await response.json()) as ListingResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Listing not found.");
        if (!data.isOwner) throw new Error("Only the listing company can manage this listing.");

        setListing(data);
        setForm({
          listingType: data.listingType === "Warehouse Space" ? "Warehouse Space" : "Transport Lane",
          title: data.title,
          location: data.location ?? "",
          origin: data.origin ?? "",
          destination: data.destination ?? "",
          capacityAmount: String(data.capacityAmount),
          capacityUnit: data.capacityUnit as ListingForm["capacityUnit"],
          temperatureClass: data.temperatureClass as ListingForm["temperatureClass"],
          availableFrom: dateOnly(data.availableFrom),
          availableTo: dateOnly(data.availableTo),
          startingBid: String(data.startingBid),
          minimumBidIncrement: String(data.minimumBidIncrement),
          biddingClosesAt: localDateTime(data.biddingClosesAt),
          notes: data.notes ?? "",
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Listing could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [params.id]);

  function updateField(field: keyof ListingForm, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !listing?.canEdit) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const closeTime = new Date(form.biddingClosesAt);
      if (Number.isNaN(closeTime.getTime())) throw new Error("Please provide a valid bidding close time.");

      const response = await fetch(`/api/listings/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, biddingClosesAt: closeTime.toISOString() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Listing could not be updated.");

      setSuccess("Listing updated successfully.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Listing could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelListing() {
    if (!listing?.canCancel) return;

    const confirmed = window.confirm(
      listing.bidCount > 0
        ? `Cancel this listing? ${listing.bidCount} existing bid${listing.bidCount === 1 ? "" : "s"} will remain in Froto history, but no new bids will be accepted.`
        : "Cancel this listing? It will be removed from the live marketplace but kept in Froto history."
    );
    if (!confirmed) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${params.id}/cancel`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Listing could not be cancelled.");
      router.push("/platform/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Listing could not be cancelled.");
      setIsCancelling(false);
    }
  }

  async function changeStatus(action: "PAUSE" | "REOPEN") {
    setIsChangingStatus(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/listings/${params.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string; status?: string };
      if (!response.ok) throw new Error(data.error ?? "Listing status could not be changed.");

      setListing((current) =>
        current
          ? {
              ...current,
              status: data.status ?? current.status,
              canPause: action === "REOPEN",
              canReopen: action === "PAUSE",
            }
          : current
      );
      setSuccess(action === "PAUSE" ? "Listing paused and removed from the marketplace." : "Listing reopened in the marketplace.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Listing status could not be changed.");
    } finally {
      setIsChangingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white p-6">
        <Card className="mx-auto max-w-4xl rounded-[1.75rem] border-froto-blue/10 bg-white p-6 text-slate-500">
          Loading listing controls...
        </Card>
      </main>
    );
  }

  if (!form || !listing) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white p-6">
        <Card className="mx-auto max-w-4xl rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><CardTitle className="text-froto-navy">Listing management unavailable</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-700">{error ?? "This listing cannot be managed."}</p>
            <Button asChild variant="outline"><Link href="/platform/dashboard">Back to dashboard</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isTransport = form.listingType === "Transport Lane";

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Manage listing</p>
            <h1 className="mt-1 text-2xl font-semibold text-froto-navy">{listing.title}</h1>
          </div>
          <Button asChild variant="outline" className="gap-2 border-froto-blue/15 bg-white text-froto-navy">
            <Link href={`/platform/listing/${listing.id}`}><ArrowLeft className="h-4 w-4" />View listing</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-7 lg:grid-cols-[1fr_280px]">
        <Card className="rounded-[1.75rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-froto-navy"><Pencil className="h-5 w-5 text-froto-blue" />Edit listing</CardTitle>
            {!listing.canEdit ? (
              <p className="text-sm text-amber-700">
                Editing is locked because this listing has {listing.bidCount} bid{listing.bidCount === 1 ? "" : "s"}. This protects bidders from material changes after bidding starts.
              </p>
            ) : (
              <p className="text-sm text-slate-500">No bids have been placed yet, so all listing details can still be changed.</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-froto-navy">Listing type
                  <select disabled={!listing.canEdit} value={form.listingType} onChange={(e) => updateField("listingType", e.target.value)} className={selectClass}>
                    <option value="Transport Lane">Transport Lane</option><option value="Warehouse Space">Warehouse Space</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Listing title
                  <Input disabled={!listing.canEdit} value={form.title} onChange={(e) => updateField("title", e.target.value)} className={fieldClass} />
                </label>
                {isTransport ? (
                  <>
                    <label className="space-y-2 text-sm font-medium text-froto-navy">Origin<Input disabled={!listing.canEdit} value={form.origin} onChange={(e) => updateField("origin", e.target.value)} className={fieldClass} /></label>
                    <label className="space-y-2 text-sm font-medium text-froto-navy">Destination<Input disabled={!listing.canEdit} value={form.destination} onChange={(e) => updateField("destination", e.target.value)} className={fieldClass} /></label>
                  </>
                ) : (
                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Location<Input disabled={!listing.canEdit} value={form.location} onChange={(e) => updateField("location", e.target.value)} className={fieldClass} /></label>
                )}
                <label className="space-y-2 text-sm font-medium text-froto-navy">Capacity<Input disabled={!listing.canEdit} type="number" min="1" value={form.capacityAmount} onChange={(e) => updateField("capacityAmount", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Capacity unit
                  <select disabled={!listing.canEdit} value={form.capacityUnit} onChange={(e) => updateField("capacityUnit", e.target.value)} className={selectClass}>
                    <option value="pallets">pallets</option><option value="parcels">parcels</option><option value="sqm">sqm</option><option value="cbm">cbm</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Temperature class
                  <select disabled={!listing.canEdit} value={form.temperatureClass} onChange={(e) => updateField("temperatureClass", e.target.value)} className={selectClass}>
                    <option value="ambient">ambient</option><option value="chilled">chilled</option><option value="frozen">frozen</option><option value="dangerous goods">dangerous goods</option><option value="other">other</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Starting bid<Input disabled={!listing.canEdit} type="number" min="0" step="0.01" value={form.startingBid} onChange={(e) => updateField("startingBid", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Available from<Input disabled={!listing.canEdit} type="date" value={form.availableFrom} onChange={(e) => updateField("availableFrom", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Available to<Input disabled={!listing.canEdit} type="date" value={form.availableTo} onChange={(e) => updateField("availableTo", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Minimum bid increment<Input disabled={!listing.canEdit} type="number" min="0.01" step="0.01" value={form.minimumBidIncrement} onChange={(e) => updateField("minimumBidIncrement", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Bidding closes<Input disabled={!listing.canEdit} type="datetime-local" value={form.biddingClosesAt} onChange={(e) => updateField("biddingClosesAt", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Notes
                  <textarea disabled={!listing.canEdit} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={4} className={`${selectClass} h-auto py-2`} />
                </label>
              </div>

              {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
              {success ? <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{success}</p> : null}

              {listing.canEdit ? (
                <Button disabled={isSaving} type="submit" className="bg-froto-navy hover:bg-[#0a356f]">
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit rounded-[1.75rem] border-red-100 bg-white shadow-md shadow-froto-navy/5">
          <CardHeader><CardTitle className="text-lg text-froto-navy">Listing controls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p><span className="font-medium text-froto-navy">Status:</span> {listing.status}</p>
              <p className="mt-1"><span className="font-medium text-froto-navy">Bids:</span> {listing.bidCount}</p>
            </div>
            {listing.canPause ? (
              <Button type="button" variant="outline" disabled={isChangingStatus} onClick={() => changeStatus("PAUSE")} className="w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                <CirclePause className="h-4 w-4" />{isChangingStatus ? "Pausing..." : "Pause listing"}
              </Button>
            ) : null}
            {listing.canReopen ? (
              <Button type="button" variant="outline" disabled={isChangingStatus} onClick={() => changeStatus("REOPEN")} className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                <CirclePlay className="h-4 w-4" />{isChangingStatus ? "Reopening..." : "Reopen listing"}
              </Button>
            ) : null}
            {listing.canCancel ? (
              <Button type="button" variant="outline" disabled={isCancelling} onClick={cancelListing} className="w-full gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                <Trash2 className="h-4 w-4" />{isCancelling ? "Cancelling..." : "Cancel listing"}
              </Button>
            ) : (
              <p className="text-sm text-slate-500">This listing can no longer be cancelled.</p>
            )}
            <p className="text-xs leading-5 text-slate-500">Cancellation keeps the listing and any bids in Froto history. It does not delete transaction records.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
