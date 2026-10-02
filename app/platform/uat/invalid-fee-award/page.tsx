import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import InvalidFeePanel from "./test-panel";

export const dynamic = "force-dynamic";

export default async function InvalidFeeAwardPage() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "billing-uat") return <main className="p-8">Use the provided UAT preview.</main>;
  const { userId } = await auth();
  if (!userId) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Sign in first</h1><p className="mt-3">Sign in as Froto test company, then reopen this page.</p><Link href="/auth-test" className="mt-4 inline-block text-blue-700 underline">Sign in to Froto</Link></main>;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  const membership = user?.companies[0];
  if (!membership || membership.companyId !== "cmspngf8m000104jlqsjud72s" || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) return <main className="p-8">Use Froto test company.</main>;
  const cases = ["spot", "marketplace", "tender"].flatMap(kind => ["overlap", "payer"].map(mode => ({ kind, mode, id: `uat-invalid-fee-${kind}-${mode}-20261002` })));
  const [spots, listings, tenders] = await Promise.all([
    prisma.spotRequirement.findMany({ where: { id: { in: cases.filter(item => item.kind === "spot").map(item => item.id) } }, include: { offers: true, job: { select: { id: true } } } }),
    prisma.listing.findMany({ where: { id: { in: cases.filter(item => item.kind === "marketplace").map(item => item.id) } }, include: { bids: true, job: { select: { id: true } } } }),
    prisma.tender.findMany({ where: { id: { in: cases.filter(item => item.kind === "tender").map(item => item.id) } }, include: { responses: true, job: { select: { id: true } } } }),
  ]);
  const ready = spots.length === 2 && listings.length === 2 && tenders.length === 2
    && [...spots, ...listings, ...tenders].every(source => source.companyId === membership.companyId && source.notes === "SIMULATED_INVALID_FEE_UAT_ONLY" && !source.job)
    && spots.every(source => source.status === "OPEN" && !source.awardedOfferId && source.offers.length === 2 && source.offers.every(offer => offer.status === "SUBMITTED"))
    && listings.every(source => source.status === "ACTIVE" && !source.awardedBidId && source.bids.length === 2)
    && tenders.every(source => source.status === "OPEN" && !source.awardedResponseId && source.responses.length === 2 && source.responses.every(response => response.status === "SUBMITTED"));
  if (!ready) return <main className="p-8">Test fixtures unavailable. Use the provided UAT preview.</main>;
  return <main className="mx-auto max-w-4xl space-y-5 p-8">
    <h1 className="text-3xl font-bold">Invalid fee-rule award UAT</h1>
    <p>These fresh fixtures check whether the complete award rejects overlapping fee rules and unsupported payers, then rolls back its writes and temporary rule changes.</p>
    <InvalidFeePanel tests={cases.map(item => ({ name: `${item.kind} — ${item.mode === "overlap" ? "overlapping rules" : "unsupported payer"}`, sourceId: item.id, url: "/api/uat/invalid-fee-award", body: { kind: item.kind, mode: item.mode } }))} />
  </main>;
}
