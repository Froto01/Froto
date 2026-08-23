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

function notificationScope(viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>) {
  const companyId = viewer.companies[0]?.companyId ?? null;

  if (companyId) {
    return {
      OR: [
        { companyId, recipientUserId: null },
        { companyId, recipientUserId: viewer.id },
        { companyId: null, recipientUserId: viewer.id },
      ],
    };
  }

  return { companyId: null, recipientUserId: viewer.id };
}

export async function GET() {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Sign in to view notifications." }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: notificationScope(viewer),
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    unreadCount: notifications.filter((item) => !item.readAt).length,
    homeHref: viewer.companies.length > 0 ? "/platform/dashboard" : "/platform/guest-dashboard",
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

  if (!viewer) {
    return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string; markAll?: boolean };
  const now = new Date();
  const scope = notificationScope(viewer);

  if (body.markAll) {
    await prisma.notification.updateMany({
      where: { ...scope, readAt: null },
      data: { readAt: now },
    });

    return NextResponse.json({ success: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Choose a notification to mark as read." }, { status: 400 });
  }

  const notification = await prisma.notification.findFirst({
    where: { id: body.id, ...scope },
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
