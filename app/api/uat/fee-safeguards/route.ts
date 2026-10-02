import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";
import { createGuestAuctionFeeSnapshotIfApplicable, createJobFeeSnapshotIfApplicable } from "@/lib/fee-snapshots";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const companyId = "cmspngf8m000104jlqsjud72s";
const types = ["MARKETPLACE_JOB", "TENDER_JOB", "GUEST_AUCTION"] as const;
type FeeType = typeof types[number];
type Result = { name: string; pass: boolean; detail: string };

function snapshot(tx: Prisma.TransactionClient, transactionType: FeeType, sourceId: string) {
  const input = { tx, sourceId, transactionAmount: { toString: () => "500.00" }, providerCompanyId: companyId, calculatedAt: new Date(), metadata: { uat: "SIMULATED_FEE_SAFEGUARDS_20261002" } };
  return transactionType === "GUEST_AUCTION"
    ? createGuestAuctionFeeSnapshotIfApplicable(input)
    : createJobFeeSnapshotIfApplicable({ ...input, transactionType, buyerCompanyId: companyId });
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "billing-uat") return NextResponse.json({ error: "UAT preview only." }, { status: 404 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Open the UAT page first." }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  const member = user?.companies[0];
  if (!member || member.companyId !== companyId || !["OWNER", "ADMIN", "MANAGER"].includes(member.role)) return NextResponse.json({ error: "Use Froto test company." }, { status: 403 });
  const marker = await prisma.spotRequirement.findUnique({ where: { id: "uat-rollback-spot-fee-20261001" }, select: { notes: true, companyId: true } });
  if (marker?.notes !== "SIMULATED_ROLLBACK_UAT_ONLY" || marker.companyId !== companyId) return NextResponse.json({ error: "Isolated UAT database required." }, { status: 409 });

  const runId = `uat-fee-safeguards-20261002-${randomUUID()}`;
  const results: Result[] = [];
  const baseline = JSON.stringify(await prisma.feeRule.findMany({ orderBy: { id: "asc" } }));
  for (const type of types) {
    for (const mode of ["overlap", "payer", "immutable"] as const) {
      const sourceId = `${runId}-${type}-${mode}`;
      const rollback = new Error("UAT_EXPECTED_ROLLBACK");
      let checked = false;
      try {
        await prisma.$transaction(async tx => {
          await tx.feeRule.updateMany({ where: { transactionType: type }, data: { active: false } });
          const rule = await tx.feeRule.create({ data: { code: `${sourceId}-rule`, version: 1, transactionType: type, payerType: mode === "payer" ? "GUEST" : "PROVIDER", percentageBps: 300, gstBps: 1000, active: true } });
          if (mode === "overlap") await tx.feeRule.create({ data: { code: `${sourceId}-second`, version: 1, transactionType: type, payerType: "PROVIDER", percentageBps: 400, gstBps: 1000, active: true } });
          if (mode === "immutable") {
            const first = await snapshot(tx, type, sourceId);
            await tx.feeRule.update({ where: { id: rule.id }, data: { percentageBps: 900 } });
            const second = await snapshot(tx, type, sourceId);
            checked = !!first && !!second && JSON.stringify(first) === JSON.stringify(second) && first.feeExGst.toString() === "15" && await tx.transactionFee.count({ where: { sourceId } }) === 1;
          } else {
            try { await snapshot(tx, type, sourceId); }
            catch (error) {
              const message = error instanceof Error ? error.message : "";
              checked = mode === "overlap" ? message === `Multiple active ${type} fee rules apply to this award.` : message.includes("must use BUYER or PROVIDER as payer.");
            }
            checked = checked && await tx.transactionFee.count({ where: { sourceId } }) === 0;
          }
          throw rollback;
        }, { timeout: 30000, maxWait: 10000 });
      } catch (error) {
        if (error !== rollback) checked = false;
      }
      const clean = await prisma.transactionFee.count({ where: { sourceId } }) === 0;
      results.push({ name: `${type}: ${mode}`, pass: checked && clean, detail: checked && clean ? "Actual helper and database checks passed; temporary changes rolled back." : "Needs investigation; do not treat as passed." });
      if (!checked || !clean) return NextResponse.json({ runId, results, complete: false });
    }
  }
  if (baseline !== JSON.stringify(await prisma.feeRule.findMany({ orderBy: { id: "asc" } }))) return NextResponse.json({ runId, results, complete: false, error: "Fee rule baseline changed; stop and investigate." });

  for (const type of types) {
    const sourceId = `${runId}-${type}-collision`;
    const started = Date.now();
    const calls = await Promise.allSettled([0, 1].map(async () => {
      const startMs = Date.now() - started;
      const fee = await prisma.$transaction(tx => snapshot(tx, type, sourceId), { timeout: 30000, maxWait: 10000 });
      return { feeId: fee?.id, startMs, endMs: Date.now() - started };
    }));
    const rows = await prisma.transactionFee.findMany({ where: { sourceId } });
    const values = calls.flatMap(call => call.status === "fulfilled" ? [call.value] : []);
    const failures = calls.flatMap(call => call.status === "rejected" ? [{ code: typeof call.reason?.code === "string" && /^P\d{4}$/.test(call.reason.code) ? call.reason.code : "UNKNOWN" }] : []);
    const pass = values.length === 2 && rows.length === 1 && values.every(value => value.feeId === rows[0].id) && rows[0].status === "CALCULATED";
    results.push({ name: `${type}: parallel duplicate creation`, pass, detail: `${values.length}/2 calls returned; ${rows.length} persisted snapshot(s). Timing: ${JSON.stringify(values)}. Failures: ${JSON.stringify(failures)}. Source: ${sourceId}` });
    if (!pass) return NextResponse.json({ runId, results, complete: false });
  }
  return NextResponse.json({ runId, results, complete: true });
}
