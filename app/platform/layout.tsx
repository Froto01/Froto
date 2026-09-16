"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, LayoutDashboard, LockKeyhole, PackageSearch, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GuestAuction = { id:string; title:string; pickupLocation:string; deliveryLocation:string; auctionClosesAt:string; status?:string; bidCount?:number };
type GuestAuctionResponse = { viewerType:"GUEST_OWNER"|"COMPANY_BIDDER"; auctions:GuestAuction[] };
type SpotRequirement = { id:string; requirementType:"TRANSPORT"|"STORAGE"; title:string; origin:string|null; destination:string|null; location:string|null; quantity:number; quantityUnit:string; requiredFrom:string; offersCloseAt:string|null; status:string; ownOffer:{amount:number;status:string}|null };
type SpotResponse = { viewerType:"OWNER"|"PROVIDER"; privacy:"SEALED_OFFERS"; requirements:SpotRequirement[] };

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname=usePathname();
  const [guestData,setGuestData]=useState<GuestAuctionResponse|null>(null);
  const [spotData,setSpotData]=useState<SpotResponse|null>(null);

  useEffect(()=>{
    const guestAwarePaths=new Set(["/platform","/platform/dashboard","/platform/listings/new"]);
    if(!guestAwarePaths.has(pathname)) return;
    let cancelled=false;
    void fetch("/api/guest-auctions",{cache:"no-store"}).then(async r=>r.ok?(await r.json()) as GuestAuctionResponse:null).then(data=>{
      if(cancelled||data?.viewerType!=="GUEST_OWNER") return;
      setGuestData(data);
      if(pathname==="/platform/listings/new"){window.location.replace("/platform/guest-auctions");return;}
      if(pathname==="/platform/dashboard") window.location.replace("/platform/guest-dashboard");
    }).catch(()=>undefined);
    return()=>{cancelled=true;};
  },[pathname]);

  useEffect(()=>{
    if(pathname!=="/platform") return;
    let cancelled=false;
    void fetch("/api/spot-requirements",{cache:"no-store"}).then(async r=>r.ok?(await r.json()) as SpotResponse:null).then(data=>{if(!cancelled&&data?.viewerType==="PROVIDER")setSpotData(data);}).catch(()=>undefined);
    return()=>{cancelled=true;};
  },[pathname]);

  return <>
    {pathname==="/platform"&&guestData?.viewerType==="GUEST_OWNER"?<div className="bg-gradient-to-b from-froto-ice to-transparent px-4 pt-6"><div className="mx-auto max-w-6xl"><Card className="rounded-[1.6rem] border-cyan-100 bg-white shadow-md shadow-froto-navy/5"><CardContent className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-froto-blue"/><p className="font-semibold text-froto-navy">Your transport requests</p></div><p className="mt-1 text-sm text-slate-500">Your guest jobs stay visible here while you browse the Froto marketplace.</p></div><div className="flex flex-wrap gap-2"><Button asChild className="gap-2 bg-froto-navy hover:bg-[#0a356f]"><Link href="/platform/guest-auctions"><PackageSearch className="h-4 w-4"/>Post a job</Link></Button><Button asChild variant="outline" className="gap-2"><Link href="/platform/guest-dashboard"><LayoutDashboard className="h-4 w-4"/>Guest dashboard</Link></Button></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{guestData.auctions.length===0?<div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No transport requests posted yet.</div>:guestData.auctions.slice(0,4).map(a=><Link key={a.id} href={`/platform/guest-auctions/${a.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-froto-blue/20 hover:bg-blue-50/30"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-froto-navy">{a.title}</p><p className="mt-1 text-sm text-slate-500">{a.pickupLocation} → {a.deliveryLocation}</p></div><Badge className={a.status==="AWARDED"?"bg-emerald-600 text-white":"bg-froto-navy text-white"}>{a.status??"OPEN"}</Badge></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{a.bidCount??0} offer{a.bidCount===1?"":"s"}</span><span className="flex items-center gap-1 font-medium text-froto-blue">Open request <ArrowRight className="h-3.5 w-3.5"/></span></div></Link>)}</div></CardContent></Card></div></div>:null}

    {pathname==="/platform"&&spotData?.viewerType==="PROVIDER"?<div className="bg-white px-4 pt-6"><div className="mx-auto max-w-6xl"><Card className="rounded-[1.6rem] border-blue-100 bg-gradient-to-r from-blue-50/70 to-cyan-50/60 shadow-md shadow-froto-navy/5"><CardContent className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-froto-blue"/><p className="font-semibold text-froto-navy">Companies need logistics now · private offers</p></div><p className="mt-1 text-sm text-slate-500">Short-term transport and storage requirements. Provider prices and identities stay sealed from competitors.</p></div><Button asChild className="gap-2 bg-froto-blue hover:bg-[#0969ba]"><Link href="/platform/spot-requirements/new"><Plus className="h-4 w-4"/>I need logistics now</Link></Button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{spotData.requirements.length===0?<div className="rounded-2xl bg-white/80 p-4 text-sm text-slate-500">No open company spot requirements right now.</div>:spotData.requirements.slice(0,6).map(r=><Link key={r.id} href={`/platform/spot-requirements/${r.id}`} className="rounded-2xl border border-blue-100 bg-white p-4 transition hover:border-froto-blue/30 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><Badge className={r.requirementType==="TRANSPORT"?"bg-froto-blue text-white":"bg-froto-teal text-white"}>{r.requirementType==="TRANSPORT"?"TRANSPORT NEEDED":"STORAGE NEEDED"}</Badge><p className="mt-2 font-semibold text-froto-navy">{r.title}</p><p className="mt-1 text-sm text-slate-500">{r.requirementType==="TRANSPORT"?`${r.origin} → ${r.destination}`:r.location}</p></div><LockKeyhole className="h-4 w-4 shrink-0 text-slate-400"/></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{r.quantity} {r.quantityUnit} · from {new Date(r.requiredFrom).toLocaleDateString("en-AU")}</span><span className="font-medium text-froto-blue">{r.ownOffer?`Your offer: ${r.ownOffer.amount.toLocaleString("en-AU",{style:"currency",currency:"AUD"})}`:"Submit private offer"} →</span></div></Link>)}</div></CardContent></Card></div></div>:null}
    {children}
  </>;
}
