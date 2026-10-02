import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { POST as spotAward } from "@/app/api/spot-requirements/[id]/award/route";
import { POST as marketplaceAward } from "@/app/api/listings/[id]/award/route";
import { POST as tenderAward } from "@/app/api/tenders/[id]/award/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function guard() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "billing-uat") return NextResponse.json({ error: "UAT preview only." }, { status: 404 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  const membership = user?.companies[0];
  if (!membership || membership.companyId !== "cmspngf8m000104jlqsjud72s" || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) return NextResponse.json({ error: "Use Froto test company." }, { status: 403 });
  const marker = await prisma.spotRequirement.findUnique({ where: { id: "uat-invalid-fee-spot-overlap-20261002" }, select: { notes: true, companyId: true } });
  if (marker?.notes !== "SIMULATED_INVALID_FEE_UAT_ONLY" || marker.companyId !== membership.companyId) return NextResponse.json({ error: "Use the provided UAT preview." }, { status: 409 });
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const rows = await prisma.$queryRaw<{ source_id: string; hits: bigint }[]>`
    SELECT 'uat-invalid-fee-spot-overlap-20261002' AS source_id, CASE WHEN is_called THEN last_value ELSE 0 END AS hits FROM froto_uat_config_spot_overlap_20261002
    UNION ALL SELECT 'uat-invalid-fee-spot-payer-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_config_spot_payer_20261002
    UNION ALL SELECT 'uat-invalid-fee-marketplace-overlap-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_config_marketplace_overlap_20261002
    UNION ALL SELECT 'uat-invalid-fee-marketplace-payer-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_config_marketplace_payer_20261002
    UNION ALL SELECT 'uat-invalid-fee-tender-overlap-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_config_tender_overlap_20261002
    UNION ALL SELECT 'uat-invalid-fee-tender-payer-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_config_tender_payer_20261002
  `;
  return NextResponse.json({ receipts: rows.map(row => ({ sourceId: row.source_id, hits: Number(row.hits) })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Open the UAT page first." }, { status: 403 });
  const denied = await guard();
  if (denied) return denied;
  let input: { kind?: unknown; mode?: unknown };
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid test selection." }, { status: 400 }); }
  if (typeof input?.kind !== "string" || typeof input?.mode !== "string" || !["spot", "marketplace", "tender"].includes(input.kind) || !["overlap", "payer"].includes(input.mode)) return NextResponse.json({ error: "Invalid test selection." }, { status: 400 });
  const kind = input.kind;
  const mode = input.mode;
  const sourceId = `uat-invalid-fee-${kind}-${mode}-20261002`;
  const body = kind === "spot" ? { offerId: `${sourceId}-a`, closeEarly: true } : kind === "marketplace" ? { bidId: `${sourceId}-a` } : { responseId: `${sourceId}-a` };
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("Content-Type", "application/json");
  const forwarded = new Request(request.url, { method: "POST", headers, body: JSON.stringify(body) });
  const handler = kind === "spot" ? spotAward : kind === "marketplace" ? marketplaceAward : tenderAward;
  try {
    // Invoke the actual award handler in this request's existing Clerk context.
    // Its authorization, validation and real Prisma transaction are unchanged.
    const response = await handler(forwarded, { params: Promise.resolve({ id: sourceId }) });
    return NextResponse.json({ sourceId, expectedFailure: false, error: "Award did not reject the intended fee configuration." }, { status: response.status });
  } catch (error) {
    const transactionType = kind === "tender" ? "TENDER_JOB" : "MARKETPLACE_JOB";
    const ruleCode = kind === "tender" ? "FROTO_TENDER_SUCCESS" : "FROTO_MARKETPLACE_SUCCESS";
    const expected = mode === "overlap" ? `Multiple active ${transactionType} fee rules apply to this award.` : `${transactionType} fee rule ${ruleCode} v1 must use BUYER or PROVIDER as payer.`;
    const expectedFailure = error instanceof Error && error.message === expected;
    return NextResponse.json({ sourceId, expectedFailure, reason: expectedFailure ? mode === "overlap" ? "Overlapping rules rejected." : "Unsupported payer rejected." : "Unexpected error; needs investigation." }, { status: 500 });
  }
}
