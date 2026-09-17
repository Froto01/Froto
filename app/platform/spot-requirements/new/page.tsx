"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function localDateTimeToIso(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Please provide valid dates and times.");
  return date.toISOString();
}

function initialRequirementType(): "TRANSPORT" | "STORAGE" {
  if (typeof window === "undefined") return "TRANSPORT";
  return new URLSearchParams(window.location.search).get("type")?.toLowerCase() === "storage" ? "STORAGE" : "TRANSPORT";
}

export default function NewSpotRequirementPage() {
  const router = useRouter();
  const [type, setType] = useState<"TRANSPORT" | "STORAGE">(initialRequirementType);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const payload = { requirementType:type, title:form.get("title"), origin:form.get("origin"), destination:form.get("destination"), location:form.get("location"), quantity:Number(form.get("quantity")), quantityUnit:form.get("quantityUnit"), temperatureClass:form.get("temperatureClass"), requiredFrom:localDateTimeToIso(form.get("requiredFrom")), requiredTo:localDateTimeToIso(form.get("requiredTo")), offersCloseAt:localDateTimeToIso(form.get("offersCloseAt")), notes:form.get("notes") };
      const response=await fetch("/api/spot-requirements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Could not post spot requirement."); router.push(`/platform/spot-requirements/${data.id}`);
    } catch(err){setError(err instanceof Error?err.message:"Could not post spot requirement.");setBusy(false);}
  }

  const input="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"; const label="grid gap-1 text-sm font-medium text-slate-700";
  const isTransport=type==="TRANSPORT";

  return <main className="mx-auto max-w-3xl p-6">
    <Link href="/platform" className="text-sm text-slate-600 hover:text-slate-900">← Marketplace</Link>
    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Spot marketplace</p>
    <h1 className="mt-2 text-3xl font-bold text-slate-950">What do you need now?</h1>
    <p className="mt-2 text-slate-600">Choose transport or storage. Providers submit private offers, then your company compares price, service and reputation and chooses who gets the job.</p>

    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={()=>setType("TRANSPORT")} className={`rounded-xl border p-5 text-left ${isTransport?"border-blue-600 bg-blue-50 ring-1 ring-blue-600":"border-slate-200 bg-white"}`}><span className="block text-xs font-bold uppercase tracking-[0.14em] text-blue-700">I need transport now</span><strong className="mt-2 block text-lg text-slate-950">Post a transport requirement</strong><span className="mt-1 block text-sm text-slate-600">Freight that needs moving from an origin to a destination now or soon.</span></button>
      <button type="button" onClick={()=>setType("STORAGE")} className={`rounded-xl border p-5 text-left ${!isTransport?"border-blue-600 bg-blue-50 ring-1 ring-blue-600":"border-slate-200 bg-white"}`}><span className="block text-xs font-bold uppercase tracking-[0.14em] text-blue-700">I need storage now</span><strong className="mt-2 block text-lg text-slate-950">Post a storage requirement</strong><span className="mt-1 block text-sm text-slate-600">Warehouse or pallet space you need in a location now or for a short period.</span></button>
    </div>

    <form onSubmit={submit} className="mt-6 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{isTransport?"Transport needed":"Storage needed"}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{isTransport?"Transport spot requirement":"Storage spot requirement"}</h2></div>
      <label className={label}>Requirement title<input className={input} name="title" required maxLength={140} placeholder={isTransport?"22 pallets Brisbane to Gold Coast":"40 pallet spaces in Brisbane for 3 weeks"}/></label>
      {isTransport?<div className="grid gap-4 md:grid-cols-2"><label className={label}>Origin<input className={input} name="origin" required/></label><label className={label}>Destination<input className={input} name="destination" required/></label></div>:<label className={label}>Storage location<input className={input} name="location" required placeholder="Brisbane, QLD"/></label>}
      <div className="grid gap-4 md:grid-cols-2"><label className={label}>Quantity<input className={input} name="quantity" type="number" min="1" step="1" required/></label><label className={label}>Unit<input className={input} name="quantityUnit" required placeholder={isTransport?"pallets, tonnes, m³":"pallets, m², m³"}/></label></div>
      <label className={label}>Temperature / handling class <span className="font-normal text-slate-500">Optional</span><input className={input} name="temperatureClass" placeholder="Ambient, chilled, frozen..."/></label>
      <div className="grid gap-4 md:grid-cols-2"><label className={label}>{isTransport?"Pickup / required from":"Storage required from"}<input className={input} name="requiredFrom" type="datetime-local" required/></label><label className={label}>{isTransport?"Required until":"Storage required until"} <span className="font-normal text-slate-500">Optional</span><input className={input} name="requiredTo" type="datetime-local"/></label></div>
      <label className={label}>Private offers close <span className="font-normal text-slate-500">Optional</span><input className={input} name="offersCloseAt" type="datetime-local"/></label>
      <label className={label}>Notes <span className="font-normal text-slate-500">Optional</span><textarea className={`${input} min-h-28`} name="notes" maxLength={2000} placeholder={!isTransport?"Access requirements, racking, forklift needs, handling frequency...":undefined}/></label>
      {error?<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-slate-900">Sealed offers:</strong> providers cannot see another provider&apos;s price or identity. Your company sees all offers and chooses the provider.</div>
      <button disabled={busy} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"Posting…":isTransport?"Post transport requirement":"Post storage requirement"}</button>
    </form>
  </main>;
}
