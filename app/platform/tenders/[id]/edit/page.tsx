"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Tender = {
  id: string;
  title: string;
  productDescription: string;
  volume: string;
  origin: string;
  destination: string;
  storageRequired: boolean;
  temperatureRequirement: string | null;
  deliveryDate: string;
  responseClosesAt: string;
  notes: string | null;
  tenderState: string;
  responseCount: number;
  isOwner: boolean;
  canEdit: boolean;
  canCancel: boolean;
};

type TenderForm = {
  title: string;
  productDescription: string;
  volume: string;
  origin: string;
  destination: string;
  storageRequired: boolean;
  temperatureRequirement: string;
  deliveryDate: string;
  responseClosesAt: string;
  notes: string;
};

const fieldClass = "border-froto-blue/15 bg-white focus-visible:border-froto-blue focus-visible:ring-froto-blue/20";

function dateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function dateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function ManageTenderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tender, setTender] = useState<Tender | null>(null);
  const [form, setForm] = useState<TenderForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/tenders/${params.id}`, { cache: "no-store" });
        const data = (await response.json()) as Tender & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Tender could not be loaded.");
        setTender(data);
        setForm({
          title: data.title,
          productDescription: data.productDescription,
          volume: data.volume,
          origin: data.origin,
          destination: data.destination,
          storageRequired: data.storageRequired,
          temperatureRequirement: data.temperatureRequirement ?? "",
          deliveryDate: dateOnly(data.deliveryDate),
          responseClosesAt: dateTimeLocal(data.responseClosesAt),
          notes: data.notes ?? "",
        });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Tender could not be loaded.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  function updateField<K extends keyof TenderForm>(field: K, value: TenderForm[K]) {
    setForm((current) => current ? { ...current, [field]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !tender?.canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const closeTime = new Date(form.responseClosesAt);
      const response = await fetch(`/api/tenders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          responseClosesAt: closeTime.toISOString(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Tender could not be updated.");
      setSuccess("Tender updated successfully.");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Tender could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelTender() {
    if (!tender?.canCancel) return;
    if (!window.confirm("Cancel this tender? Supplier response history will be preserved, but no new responses or award will be allowed.")) return;
    setCancelling(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/tenders/${params.id}/cancel`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Tender could not be cancelled.");
      router.push(`/platform/tenders/${params.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Tender could not be cancelled.");
      setCancelling(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white p-8 text-sm text-slate-500">Loading tender controls...</main>;

  if (!tender || !form || error && !tender) {
    return <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white p-8"><div className="mx-auto max-w-4xl"><Card><CardContent className="p-6 text-sm text-red-700">{error ?? "Tender not found."}</CardContent></Card></div></main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-4xl px-4 py-7">
        <Button asChild variant="outline" className="mb-6 gap-2 border-froto-green/15 bg-white text-froto-navy">
          <Link href={`/platform/tenders/${params.id}`}><ArrowLeft className="h-4 w-4 text-froto-teal" />Back to tender</Link>
        </Button>

        <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/10 bg-white shadow-lg shadow-froto-navy/5">
          <div className="h-1.5 bg-gradient-to-r from-froto-teal via-froto-cyan to-froto-green" />
          <CardHeader className="border-b border-froto-green/10 bg-emerald-50/30">
            <CardTitle className="flex items-center gap-2 text-2xl text-froto-navy"><ClipboardList className="h-5 w-5 text-froto-teal" />Manage Tender</CardTitle>
            <p className="text-sm text-slate-500">
              {tender.canEdit
                ? "You can edit all tender details until the first supplier response is submitted."
                : tender.responseCount > 0
                  ? "Editing is locked because supplier responses have started. Cancellation remains available until award."
                  : "This tender can no longer be edited."}
            </p>
          </CardHeader>
          <CardContent className="p-6 sm:p-7">
            <form onSubmit={save} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Tender title<Input disabled={!tender.canEdit} value={form.title} onChange={(e) => updateField("title", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Product / SKU description<Input disabled={!tender.canEdit} value={form.productDescription} onChange={(e) => updateField("productDescription", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Volume<Input disabled={!tender.canEdit} value={form.volume} onChange={(e) => updateField("volume", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Delivery date<Input disabled={!tender.canEdit} type="date" value={form.deliveryDate} onChange={(e) => updateField("deliveryDate", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Origin<Input disabled={!tender.canEdit} value={form.origin} onChange={(e) => updateField("origin", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Destination<Input disabled={!tender.canEdit} value={form.destination} onChange={(e) => updateField("destination", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Temperature requirement<Input disabled={!tender.canEdit} value={form.temperatureRequirement} onChange={(e) => updateField("temperatureRequirement", e.target.value)} className={fieldClass} /></label>
                <label className="space-y-2 text-sm font-medium text-froto-navy">Responses close<Input disabled={!tender.canEdit} type="datetime-local" value={form.responseClosesAt} onChange={(e) => updateField("responseClosesAt", e.target.value)} className={fieldClass} /></label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-froto-navy sm:col-span-2"><input disabled={!tender.canEdit} type="checkbox" checked={form.storageRequired} onChange={(e) => updateField("storageRequired", e.target.checked)} />Storage required</label>
                <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">Notes<textarea disabled={!tender.canEdit} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className="min-h-28 w-full rounded-md border border-froto-green/15 bg-white px-3 py-2 text-sm disabled:bg-slate-50" /></label>
              </div>

              {success ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}
              {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                <Button type="submit" disabled={!tender.canEdit || saving} className="gap-2 bg-froto-navy hover:bg-[#0a356f]"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save changes"}</Button>
                {tender.canCancel ? <Button type="button" variant="outline" disabled={cancelling} onClick={() => void cancelTender()} className="gap-2 border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />{cancelling ? "Cancelling..." : "Cancel tender"}</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
