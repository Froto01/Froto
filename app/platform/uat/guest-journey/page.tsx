import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import CreateGuestTest from "./test-panel";

export const dynamic = "force-dynamic";
const marker = "SIMULATED_GUEST_E2E_UAT_20261023";

export default async function GuestJourneyPage() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "billing-uat") return <main className="p-8">Use the provided UAT preview.</main>;
  const { userId } = await auth();
  if (!userId) return <main className="mx-auto max-w-3xl space-y-4 p-8"><h1 className="text-2xl font-bold">Sign in as the guest customer</h1><p>Use an individual Froto account with no company membership. If creating an account, choose “I need something moved” on the welcome screen. Reopen this test page after sign-in.</p><Link href="/auth-test" className="text-blue-700 underline">Sign in to Froto</Link></main>;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  if (!user) return <main className="p-8"><Link href="/start" className="text-blue-700 underline">Complete your Froto account setup</Link></main>;
  if (user.companies.length > 0) return <main className="mx-auto max-w-3xl space-y-4 p-8"><h1 className="text-2xl font-bold">Use the individual guest account</h1><p>This account belongs to a company. Open the sign-in page, sign out using the account menu, then sign in with your individual guest account. Reopen this page afterward.</p><Link href="/auth-test" className="text-blue-700 underline">Open account menu</Link></main>;
  const isolated = await prisma.spotRequirement.findUnique({ where: { id: "uat-invalid-fee-spot-overlap-20261002" }, select: { notes: true } });
  if (isolated?.notes !== "SIMULATED_INVALID_FEE_UAT_ONLY") return <main className="p-8">Use the provided isolated UAT preview.</main>;
  const existing = await prisma.guestAuction.findFirst({ where: { createdByUserId: user.id, notes: marker }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, title: true } });
  return <main className="mx-auto max-w-3xl space-y-5 p-8">
    <h1 className="text-3xl font-bold">Guest auction journey UAT</h1>
    <p>Signed in as the guest customer. We will test posting, sealed company bids, comparing provider reviews, awarding, delivery confirmation and a verified review.</p>
    {existing ? <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Your simulated job is ready</h2><p>{existing.title} · {existing.status.replaceAll("_", " ")}</p><Link href={`/platform/guest-auctions/${existing.id}`} className="inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white">Open test job</Link><p>Send the job page screenshot. Keep it open for company bids.</p></section> : <CreateGuestTest />}
    <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600"><li>Guest customer creates the simulated job.</li><li>Froto test company bids $250. Hardlywork bids $300. Each company checks that only its own bid is visible.</li><li>Guest customer compares both offers and provider reviews, then awards one company.</li><li>Winning company accepts, starts and marks delivery. Guest customer confirms completion and submits a review.</li></ol>
    <p className="text-sm text-slate-600">We will verify each stage in the database. No invoice or payment is part of this test.</p>
  </main>;
}
