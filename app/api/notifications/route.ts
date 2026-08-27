import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type NotificationReceiptRow = {
  notificationId: string;
  readAt: Date;
};

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

async function getReceiptMap(userId: string) {
  const receipts = await prisma.$queryRaw<NotificationReceiptRow[]>`
    SELECT "notificationId", "readAt"
    FROM "NotificationReceipt"
    WHERE "userId" = ${userId}
  `;

  return new Map(receipts.map((receipt) => [receipt.notificationId, receipt.readAt]));
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
  const receiptMap = await getReceiptMap(viewer.id);

  return NextResponse.json({
    unreadCount: notifications.filter((item) => !receiptMap.has(item.id)).length,
    homeHref: viewer.companies.length > 0 ? "/platform/dashboard" : "/platform/guest-dashboard",
    notifications: notifications.map((item) => {
      const readAt = receiptMap.get(item.id) ?? null;

      return {
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        href: item.href,
        readAt: readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      };
    }),
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
    const notifications = await prisma.notification.findMany({
      where: scope,
      select: { id: true },
    });

    if (notifications.length > 0) {
      await prisma.$transaction(
        notifications.map((notification) =>
          prisma.$executeRaw`
            INSERT INTO "NotificationReceipt" ("notificationId", "userId", "readAt")
            VALUES (${notification.id}, ${viewer.id}, ${now})
            ON CONFLICT ("notificationId", "userId")
            DO UPDATE SET "readAt" = EXCLUDED."readAt"
          `,
        ),
      );
    }

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

  await prisma.$executeRaw`
    INSERT INTO "NotificationReceipt" ("notificationId", "userId", "readAt")
    VALUES (${notification.id}, ${viewer.id}, ${now})
    ON CONFLICT ("notificationId", "userId")
    DO UPDATE SET "readAt" = EXCLUDED."readAt"
  `;

  return NextResponse.json({ success: true });
}
