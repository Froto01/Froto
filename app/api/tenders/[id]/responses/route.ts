import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ResponseResult =
  | { ok: true; id: string; amount: number }
  | { ok: false; status: number; error: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to respond to this tender." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Complete your Froto account setup first." }, { status: 403 });
  }
  const membership = user.companies[0];
  if (!membership) {
    return NextResponse.json({ error: "Create a company before responding." }, { status: 403 });
  }

  let body: { amount?: number; serviceDescription?: string; leadTime?: string; notes?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid tender response request." }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Provide a response amount greater than zero." }, { status: 400 });
  }

  // TenderResponse.amount is Decimal(12, 2). Reject values that would be
  // rounded or overflow on insert, rather than persisting a different quote.
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(String(amount))) {
    return NextResponse.json(
      { error: "Response amounts must fit the supported currency range and have no more than two decimal places." },
      { status: 400 }
    );
  }

  // An award updates this same tender row. Lock and recheck the parent inside
  // the INSERT transaction so a delayed request cannot respond after award.
  const result: ResponseResult = await prisma.$transaction(async (tx): Promise<ResponseResult> => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Tender" WHERE "id" = ${id} FOR UPDATE
    `;
    if (locked.length !== 1) {
      return { ok: false, status: 404, error: "Tender not found." };
    }

    const tender = await tx.tender.findUnique({
      where: { id },
      select: { id: true, title: true, companyId: true, status: true, responseClosesAt: true, awardedResponseId: true },
    });
    if (!tender) {
      return { ok: false, status: 404, error: "Tender not found." };
    }
    if (tender.companyId === membership.companyId) {
      return { ok: false, status: 403, error: "You cannot respond to your own company tender." };
    }
    if (tender.status !== "OPEN" || tender.awardedResponseId) {
      return { ok: false, status: 409, error: "This tender is no longer accepting responses." };
    }
    if (tender.responseClosesAt.getTime() <= Date.now()) {
      return { ok: false, status: 409, error: "The response window has closed." };
    }

    const response = await tx.tenderResponse.create({
      data: {
        tenderId: tender.id,
        companyId: membership.companyId,
        submittedByUserId: user.id,
        amount,
        serviceDescription: body.serviceDescription?.trim() || null,
        leadTime: body.leadTime?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });
    await tx.notification.create({
      data: {
        companyId: tender.companyId,
        type: "TENDER_RESPONSE_RECEIVED",
        title: "New tender response",
        message: `${membership.companyId === tender.companyId ? "A company" : "A supplier"} responded to ${tender.title}.`,
        href: `/platform/tenders/${tender.id}`,
        metadata: {
          tenderId: tender.id,
          responseId: response.id,
          respondingCompanyId: membership.companyId,
          amount,
        },
      },
    });
    return { ok: true, id: response.id, amount: Number(response.amount) };
  }, { isolationLevel: "Serializable" }).catch((error: unknown): ResponseResult => {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") {
        return { ok: false, status: 409, error: "Your company has already submitted a response to this tender." };
      }
      if (error.code === "P2034") {
        return { ok: false, status: 409, error: "This tender changed while responding. Refresh and try again." };
      }
    }
    throw error;
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, responseId: result.id, amount: result.amount }, { status: 201 });
}
