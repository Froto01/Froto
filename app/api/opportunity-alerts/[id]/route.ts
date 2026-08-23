import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

async function currentUserId() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  return user?.id ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const preference = await prisma.opportunityAlertPreference.findFirst({ where: { id, userId } });
  if (!preference) return NextResponse.json({ error: "Alert preference not found." }, { status: 404 });

  const body = (await request.json()) as { active?: boolean };
  if (typeof body.active !== "boolean") return NextResponse.json({ error: "Invalid alert state." }, { status: 400 });

  await prisma.opportunityAlertPreference.update({ where: { id }, data: { active: body.active } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const preference = await prisma.opportunityAlertPreference.findFirst({ where: { id, userId } });
  if (!preference) return NextResponse.json({ error: "Alert preference not found." }, { status: 404 });

  await prisma.opportunityAlertPreference.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
