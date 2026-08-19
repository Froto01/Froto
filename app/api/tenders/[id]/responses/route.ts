import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  const tender = await prisma.tender.findUnique({
    where: { id },
    select: {
      id: true,
      companyId: true,
      status: true,
      responseClosesAt: true,
      awardedResponseId: true,
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "Tender not found." }, { status: 404 });
  }

  if (tender.companyId === membership.companyId) {
    return NextResponse.json({ error: "You cannot respond to your own company tender." }, { status: 403 });
  }

  if (tender.status !== "OPEN" || tender.awardedResponseId) {
    return NextResponse.json({ error: "This tender is no longer accepting responses." }, { status: 409 });
  }

  if (tender.responseClosesAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The response window has closed." }, { status: 409 });
  }

  const body = (await request.json()) as {
    amount?: number;
    serviceDescription?: string;
    leadTime?: string;
    notes?: string;
  };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Provide a valid response amount." }, { status: 400 });
  }

  try {
    const response = await prisma.tenderResponse.create({
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

    return NextResponse.json(
      { success: true, responseId: response.id, amount: Number(response.amount) },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Your company has already submitted a response to this tender." },
        { status: 409 }
      );
    }

    throw error;
  }
}
