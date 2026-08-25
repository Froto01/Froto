import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, Flame, Megaphone, Sparkles, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PRODUCTS = [
  {
    name: "Featured",
    icon: Sparkles,
    description: "Give an eligible marketplace listing stronger visibility in the live spot market.",
    use: "General transport or capacity listings",
  },
  {
    name: "Priority placement",
    icon: Zap,
    description: "Move an eligible opportunity higher in relevant marketplace results for its active promotion window.",
    use: "Time-sensitive capacity and demand",
  },
  {
    name: "Urgent freight",
    icon: Flame,
    description: "Clearly identify an urgent transport opportunity and give it the strongest promotion priority.",
    use: "Short-notice freight and overflow work",
  },
  {
    name: "Featured warehouse capacity",
    icon: Building2,
    description: "Highlight temporary 3PL or pallet capacity without changing the underlying listing terms.",
    use: "Short-term warehouse and storage capacity",
  },
  {
    name: "Highlighted tender",
    icon: Megaphone,
    description: "Give a live tender additional marketplace visibility while keeping supplier pricing sealed.",
    use: "Open tenders seeking more qualified responses",
  },
];

export default function PromotionsPreviewPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Button asChild variant="outline" className="mb-6 gap-2 border-froto-blue/15 bg-white text-froto-navy">
          <Link href="/platform">
            <ArrowLeft className="h-4 w-4 text-froto-blue" />
            Back to marketplace
          </Link>
        </Button>

        <section className="overflow-hidden rounded-[2rem] border border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
          <div className="bg-gradient-to-r from-froto-navy via-[#0a4778] to-froto-teal px-6 py-8 text-white sm:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/10">Sprint 9 preview</Badge>
              <Badge className="border border-amber-200/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/15">Not yet for sale</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Promote a Froto opportunity</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 sm:text-base">
              Normal marketplace participation stays free. Promotion is an optional way to give a live opportunity additional visibility when speed or reach matters.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8">
            <div className="mb-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-froto-ice p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-blue">Core access</p>
                <p className="mt-2 font-semibold text-froto-navy">Free marketplace participation</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Promotion will never be required to create or compete for ordinary Froto opportunities.</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-froto-teal">Transparency</p>
                <p className="mt-2 font-semibold text-froto-navy">Paid placement will be labelled</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Promoted opportunities will never masquerade as neutral marketplace ranking.</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Activation</p>
                <p className="mt-2 font-semibold text-froto-navy">Pricing is deliberately on hold</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">No promotion price, payment or charge will activate before commercial approval.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PRODUCTS.map((product) => {
                const Icon = product.icon;
                return (
                  <Card key={product.name} className="rounded-[1.5rem] border-froto-blue/10 bg-white shadow-sm shadow-froto-navy/5">
                    <CardHeader>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-froto-ice text-froto-blue">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="mt-3 text-xl text-froto-navy">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-6 text-slate-600">{product.description}</p>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Best suited to</p>
                        <p className="mt-1 text-sm font-medium text-froto-navy">{product.use}</p>
                      </div>
                      <Button disabled className="w-full bg-slate-200 text-slate-500 opacity-100">
                        Pricing to be confirmed
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="leading-6">
                Promotion changes visibility only. It does not change bid rules, verification, reviews, sealed-pricing protections, award logic or the underlying commercial terms of an opportunity.
              </p>
            </div>
          </CardContent>
        </section>
      </div>
    </main>
  );
}
