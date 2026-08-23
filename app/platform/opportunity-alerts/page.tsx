"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BellRing, Mail, MapPin, PauseCircle, PlayCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Preference = {
  id: string;
  name: string;
  opportunityTypes: string[];
  areaKeywords: string[];
  inAppEnabled: boolean;
  emailEnabled: boolean;
  active: boolean;
};

const OPPORTUNITY_TYPES = [
  ["TRANSPORT_LANE", "Transport lanes"],
  ["WAREHOUSE_SPACE", "Warehouse space"],
  ["TENDER", "Tenders"],
  ["GUEST_JOB", "Guest transport jobs"],
] as const;

function labelType(type: string) {
  return OPPORTUNITY_TYPES.find(([value]) => value === type)?.[1] ?? type;
}

export default function OpportunityAlertsPage() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("My opportunities");
  const [types, setTypes] = useState<string[]>(["TRANSPORT_LANE", "WAREHOUSE_SPACE", "TENDER", "GUEST_JOB"]);
  const [areas, setAreas] = useState("");
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/opportunity-alerts", { cache: "no-store" });
      const payload = (await response.json()) as { preferences?: Preference[]; email?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Alerts could not be loaded.");
      setPreferences(payload.preferences ?? []);
      setEmail(payload.email ?? "");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alerts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleType(type: string) {
    setTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);
  }

  async function createPreference() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/opportunity-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          opportunityTypes: types,
          areaKeywords: areas.split(",").map((value) => value.trim()).filter(Boolean),
          inAppEnabled,
          emailEnabled,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Alert could not be saved.");
      setAreas("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alert could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(id: string, active: boolean) {
    setSaving(true);
    try {
      const response = await fetch(`/api/opportunity-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error("Alert could not be updated.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alert could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this opportunity alert?")) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/opportunity-alerts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Alert could not be deleted.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alert could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16"><div className="mx-auto max-w-5xl px-4 py-8">
    <Button asChild variant="outline" className="mb-6 gap-2"><Link href="/platform/dashboard"><ArrowLeft className="h-4 w-4" />Dashboard</Link></Button>
    <div className="flex items-start gap-4"><div className="rounded-2xl bg-froto-navy p-3 text-white"><BellRing className="h-6 w-6" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">Opportunity alerts</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-froto-navy">Tell Froto what to watch for</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Save the opportunity types and areas that matter to you. Froto can surface matching transport, storage, tender and guest-job opportunities as they appear.</p></div></div>

    {error ? <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

    <Card className="mt-7 rounded-[1.7rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5"><CardHeader><CardTitle className="text-froto-navy">Create an alert</CardTitle></CardHeader><CardContent className="space-y-5">
      <div><label className="text-sm font-medium text-froto-navy">Alert name</label><Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. South East Queensland opportunities" /></div>
      <div><p className="text-sm font-medium text-froto-navy">Opportunity types</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{OPPORTUNITY_TYPES.map(([value, label]) => <label key={value} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={types.includes(value)} onChange={() => toggleType(value)} /><span>{label}</span></label>)}</div></div>
      <div><label className="text-sm font-medium text-froto-navy">Areas of interest</label><Input className="mt-2" value={areas} onChange={(event) => setAreas(event.target.value)} placeholder="Brisbane, Gold Coast, Beenleigh, Sunshine Coast" /><p className="mt-2 text-xs text-slate-500">Use comma-separated suburbs, cities, regions or lane keywords. Matching is intentionally broad for launch so useful opportunities are not missed.</p></div>
      <div><p className="text-sm font-medium text-froto-navy">Delivery</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={inAppEnabled} onChange={(event) => setInAppEnabled(event.target.checked)} /><BellRing className="h-4 w-4 text-froto-blue" />In-app notification</label><label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={emailEnabled} onChange={(event) => setEmailEnabled(event.target.checked)} /><Mail className="h-4 w-4 text-froto-teal" />Email to {email || "your Froto email"}</label></div><p className="mt-2 text-xs text-slate-500">Email preferences are saved now. External email delivery will be enabled when Froto's transactional email provider is connected.</p></div>
      <Button disabled={saving || loading} onClick={() => void createPreference()} className="bg-froto-navy hover:bg-[#0a356f]">{saving ? "Saving..." : "Save opportunity alert"}</Button>
    </CardContent></Card>

    <Card className="mt-6 rounded-[1.7rem] border-froto-teal/10 bg-white shadow-md shadow-froto-navy/5"><CardHeader><CardTitle className="text-froto-navy">Saved alerts</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <p className="text-sm text-slate-500">Loading alerts...</p> : preferences.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No saved alerts yet.</p> : preferences.map((preference) => <div key={preference.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-froto-navy">{preference.name}</p><Badge className={preference.active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}>{preference.active ? "Active" : "Paused"}</Badge></div><div className="mt-2 flex flex-wrap gap-2">{preference.opportunityTypes.map((type) => <Badge key={type} className="border border-froto-blue/10 bg-blue-50 text-froto-blue">{labelType(type)}</Badge>)}</div><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><MapPin className="h-4 w-4" />{preference.areaKeywords.join(" · ")}</p><p className="mt-2 text-xs text-slate-500">Delivery: {[preference.inAppEnabled ? "In-app" : null, preference.emailEnabled ? "Email" : null].filter(Boolean).join(" + ")}</p></div><div className="flex gap-2"><Button disabled={saving} variant="outline" onClick={() => void setActive(preference.id, !preference.active)} className="gap-2">{preference.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}{preference.active ? "Pause" : "Resume"}</Button><Button disabled={saving} variant="outline" onClick={() => void remove(preference.id)} className="gap-2 text-red-700"><Trash2 className="h-4 w-4" />Delete</Button></div></div></div>)}</CardContent></Card>
  </div></main>;
}
