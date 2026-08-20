import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in to cancel this tender." }, { status: 401 });
  }

  const viewer = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });

  if (!viewer) {
    return NextResponse.json({ error: "Complete your Froto user setup first." }, { status: 409 });
  }

  const membership = viewer.companies[0];
  if (!membership) {
    return NextResponse.json({ error: "Create or join a company before managing tenders." }, { status: 403 });
  }

  if (!MANAGE_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Your company role cannot cancel tenders." }, { status: 403 });
  }

  try {
    const tender = await prisma.$transaction(
      async (tx) => {
        const current = await tx.tender.findUnique({ where: { id } });

        if (!current) throw new Error("NOT_FOUND");
        if (current.companyId !== membership.companyId) throw new Error("FORBIDDEN");
        if (current.awardedResponseId || current.status === "AWARDED") throw new Error("AWARDED");
        if (current.status === "CANCELLED") return current;

        return tx.tender.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ success: true, tenderId: tender.id, status: tender.status });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Tender not found." }, { status: 404 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Only the tender owner can cancel it." }, { status: 403 });
      }
      if (error.message === "AWARDED") {
        return NextResponse.json({ error: "An awarded tender cannot be cancelled." }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Froto could not cancel this tender." }, { status: 500 });
  }
}
