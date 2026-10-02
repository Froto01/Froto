import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "billing-uat") return NextResponse.json({ error: "UAT preview only." }, { status: 404 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { companies: { take: 1 } } });
  const membership = user?.companies[0];
  if (!membership || membership.companyId !== "cmspngf8m000104jlqsjud72s" || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) return NextResponse.json({ error: "Use Froto test company." }, { status: 403 });
  const marker = await prisma.spotRequirement.findUnique({ where: { id: "uat-rollback-spot-fee-20261002" }, select: { notes: true, companyId: true } });
  if (marker?.notes !== "SIMULATED_ROLLBACK_STAGE_UAT_ONLY" || marker.companyId !== membership.companyId) return NextResponse.json({ error: "Use the provided UAT preview." }, { status: 409 });
  const rows = await prisma.$queryRaw<{ source_id: string; hits: bigint }[]>`
    SELECT 'uat-rollback-spot-fee-20261002' AS source_id, CASE WHEN is_called THEN last_value ELSE 0 END AS hits FROM froto_uat_stage_spot_fee_20261002
    UNION ALL SELECT 'uat-rollback-spot-notification-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_stage_spot_notification_20261002
    UNION ALL SELECT 'uat-rollback-marketplace-fee-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_stage_marketplace_fee_20261002
    UNION ALL SELECT 'uat-rollback-marketplace-notification-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_stage_marketplace_notification_20261002
    UNION ALL SELECT 'uat-rollback-tender-fee-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_stage_tender_fee_20261002
    UNION ALL SELECT 'uat-rollback-tender-notification-20261002', CASE WHEN is_called THEN last_value ELSE 0 END FROM froto_uat_stage_tender_notification_20261002
  `;
  return NextResponse.json({ receipts: rows.map(row => ({ sourceId: row.source_id, hits: Number(row.hits) })) }, { headers: { "Cache-Control": "no-store" } });
}
