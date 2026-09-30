import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import RollbackPanel from "./test-panel";

export const dynamic = "force-dynamic";

export default async function AwardRollbackPage() {
  const { userId } = await auth();
  if (!userId) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Sign in first</h1><p className="mt-3">Sign in as Froto test company, then reopen this page.</p><Link href="/auth-test" className="mt-4 inline-block text-blue-700 underline">Sign in to Froto</Link></main>;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  const membership = user?.companies[0];
  if (!membership || membership.companyId !== "cmspngf8m000104jlqsjud72s" || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Use Froto test company</h1><p className="mt-3">Only the simulated posting company can run this test.</p></main>;

  const cases = ["spot", "marketplace", "tender"].flatMap(kind => ["fee", "notification"].map(mode => ({ kind, mode, id: `uat-rollback-${kind}-${mode}-20261001` })));
  const [spots, listings, tenders] = await Promise.all([
    prisma.spotRequirement.findMany({ where: { id: { in: cases.filter(item => item.kind === "spot").map(item => item.id) } }, include: { offers: true, job: { select: { id: true } } } }),
    prisma.listing.findMany({ where: { id: { in: cases.filter(item => item.kind === "marketplace").map(item => item.id) } }, include: { bids: true, job: { select: { id: true } } } }),
    prisma.tender.findMany({ where: { id: { in: cases.filter(item => item.kind === "tender").map(item => item.id) } }, include: { responses: true, job: { select: { id: true } } } }),
  ]);
  const ready = spots.length === 2 && listings.length === 2 && tenders.length === 2
    && [...spots, ...listings, ...tenders].every(source => source.companyId === membership.companyId && source.notes === "SIMULATED_ROLLBACK_UAT_ONLY" && !source.job)
    && spots.every(source => source.status === "OPEN" && !source.awardedOfferId && source.offers.length === 2 && source.offers.every(offer => offer.status === "SUBMITTED"))
    && listings.every(source => source.status === "ACTIVE" && !source.awardedBidId && source.bids.length === 2)
    && tenders.every(source => source.status === "OPEN" && !source.awardedResponseId && source.responses.length === 2 && source.responses.every(response => response.status === "SUBMITTED"));
  if (!ready) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Test fixtures unavailable</h1><p className="mt-3">Use the isolated UAT preview. Do not reset or award these fixtures manually.</p></main>;
  return <RollbackPanel tests={cases.map(item => ({
    name: `${item.kind} — ${item.mode === "fee" ? "fee creation" : "loser notification"} failure`,
    sourceId: item.id,
    url: `/api/${item.kind === "spot" ? "spot-requirements" : item.kind === "marketplace" ? "listings" : "tenders"}/${item.id}/award`,
    body: item.kind === "spot" ? { offerId: `${item.id}-a`, closeEarly: true } : item.kind === "marketplace" ? { bidId: `${item.id}-a` } : { responseId: `${item.id}-a` },
  }))} />;
}
