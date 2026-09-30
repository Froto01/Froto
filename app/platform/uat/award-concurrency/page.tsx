import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import AwardConcurrencyTest from "./test-panel";

export const dynamic = "force-dynamic";

export default async function AwardConcurrencyPage() {
  const { userId } = await auth();
  if (!userId) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Sign in first</h1><p className="mt-3">Sign in as Froto test company, then reopen this test page.</p><Link href="/auth-test" className="mt-4 inline-block text-blue-700 underline">Sign in to Froto</Link></main>;

  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  const membership = user?.companies[0];
  if (!membership || membership.companyId !== "cmspngf8m000104jlqsjud72s" || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Use Froto test company</h1><p className="mt-3">This test is available only to the company that owns the simulated requirement.</p></main>;
  }

  const requirement = await prisma.spotRequirement.findUnique({
    where: { id: "uat-http-award-20261001" },
    include: { offers: { orderBy: { id: "asc" }, include: { company: { select: { name: true } } } }, job: { select: { id: true } } },
  });
  if (!requirement || requirement.companyId !== membership.companyId || requirement.notes !== "SIMULATED_HTTP_AWARD_UAT_ONLY") {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Test fixture unavailable</h1><p className="mt-3">Open this page on the isolated UAT preview.</p></main>;
  }
  const offers = requirement.offers.filter(offer => ["uat-http-award-a-20261001", "uat-http-award-b-20261001"].includes(offer.id));
  if (requirement.status !== "OPEN" || requirement.awardedOfferId || offers.length !== 2 || offers.some(offer => offer.status !== "SUBMITTED")) {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Test already run or unavailable</h1><p className="mt-3">This fixture must be open with two submitted offers. Do not reset or award it again.</p>{requirement.job ? <Link className="mt-4 inline-block text-blue-700 underline" href={`/platform/jobs/${requirement.job.id}`}>Open the simulated job</Link> : null}</main>;
  }
  return <AwardConcurrencyTest requirementId={requirement.id} offers={offers.map(offer => ({ id: offer.id, company: offer.company.name, amount: Number(offer.amount) }))} />;
}
