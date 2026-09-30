import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AwardConcurrencyTest from "../test-panel";

export const dynamic = "force-dynamic";

type Fixture = { id: string; companyId: string; notes: string | null; available: boolean; job: { id: string } | null; offers: { id: string; company: string; amount: number }[] };

export default async function RemainingAwardUat({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "marketplace" && kind !== "tender") notFound();
  const { userId } = await auth();
  if (!userId) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Sign in first</h1><p className="mt-3">Sign in as Froto test company, then reopen this test page.</p><Link href="/auth-test" className="mt-4 inline-block text-blue-700 underline">Sign in to Froto</Link></main>;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  const membership = user?.companies[0];
  if (!membership || membership.companyId !== "cmspngf8m000104jlqsjud72s" || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Use Froto test company</h1><p className="mt-3">Only award-capable users of the simulated posting company can run this test.</p></main>;
  }
  // eslint-disable-next-line react-hooks/purity -- Dynamic server page must check the current award window.
  const serverTime = Date.now();
  let fixture: Fixture | null;
  if (kind === "marketplace") {
    const listing = await prisma.listing.findUnique({
      where: { id: "uat-http-marketplace-20261001" },
      include: { bids: { where: { id: { in: ["uat-http-marketplace-a-20261001", "uat-http-marketplace-b-20261001"] } }, orderBy: { id: "asc" }, include: { bidderCompany: { select: { name: true } } } }, job: { select: { id: true } } },
    });
    fixture = listing ? { id: listing.id, companyId: listing.companyId, notes: listing.notes, available: listing.status === "ACTIVE" && !listing.awardedBidId && Boolean(listing.biddingClosesAt && listing.biddingClosesAt.getTime() <= serverTime), job: listing.job, offers: listing.bids.map(bid => ({ id: bid.id, company: bid.bidderCompany.name, amount: Number(bid.amount) })) } : null;
  } else {
    const tender = await prisma.tender.findUnique({
      where: { id: "uat-http-tender-20261001" },
      include: { responses: { where: { id: { in: ["uat-http-tender-a-20261001", "uat-http-tender-b-20261001"] } }, orderBy: { id: "asc" }, include: { company: { select: { name: true } } } }, job: { select: { id: true } } },
    });
    fixture = tender ? { id: tender.id, companyId: tender.companyId, notes: tender.notes, available: tender.status === "OPEN" && !tender.awardedResponseId && tender.responseClosesAt.getTime() <= serverTime && tender.responses.every(response => response.status === "SUBMITTED"), job: tender.job, offers: tender.responses.map(response => ({ id: response.id, company: response.company.name, amount: Number(response.amount) })) } : null;
  }
  if (!fixture || fixture.companyId !== membership.companyId || fixture.notes !== "SIMULATED_HTTP_AWARD_UAT_ONLY") return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Test fixture unavailable</h1><p className="mt-3">Use the isolated UAT preview.</p></main>;
  if (!fixture.available || fixture.offers.length !== 2) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Test already run or unavailable</h1><p className="mt-3">Do not reset or rerun this fixture.</p>{fixture.job ? <Link className="mt-4 inline-block text-blue-700 underline" href={`/platform/jobs/${fixture.job.id}`}>Open the simulated job</Link> : null}</main>;
  return <AwardConcurrencyTest requirementId={fixture.id} offers={fixture.offers} title={kind === "marketplace" ? "Marketplace simultaneous award UAT" : "Tender simultaneous award UAT"} awardUrl={`/api/${kind === "marketplace" ? "listings" : "tenders"}/${fixture.id}/award`} selectionKey={kind === "marketplace" ? "bidId" : "responseId"} />;
}
