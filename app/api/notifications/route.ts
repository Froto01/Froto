import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getViewer() {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { companies: true },
  });
}

export async function GET() {
  const viewer = await getViewer();
  const membership = viewer?.companies[0];

  if (!viewer || !membership) {
    return NextResponse.json({ error: "Sign in with a Froto company to view notifications." }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      companyId: membership.companyId,
      OR: [{ recipientUserId: null }, { recipientUserId: viewer.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    unreadCount: notifications.filter((item) => !item.readAt).length,
    notifications: notifications.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      href: item.href,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const viewer = await getViewer();
  const membership = viewer?.companies[0];

  if (!viewer || !membership) {
    return NextResponse.json({ error: "Sign in with a Froto company to update notifications." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string; markAll?: boolean };
  const now = new Date();

  if (body.markAll) {
    await prisma.notification.updateMany({
      where: {
        companyId: membership.companyId,
        readAt: null,
        OR: [{ recipientUserId: null }, { recipientUserId: viewer.id }],
      },
      data: { readAt: now },
    });

    return NextResponse.json({ success: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Choose a notification to mark as read." }, { status: 400 });
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: body.id,
      companyId: membership.companyId,
      OR: [{ recipientUserId: null }, { recipientUserId: viewer.id }],
    },
    select: { id: true },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: { readAt: now },
  });

  return NextResponse.json({ success: true });
}
