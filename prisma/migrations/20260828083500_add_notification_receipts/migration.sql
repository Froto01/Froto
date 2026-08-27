-- Preserve Notification as the immutable message and store read state per viewer.
CREATE TABLE "NotificationReceipt" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationReceipt_pkey" PRIMARY KEY ("notificationId","userId")
);

CREATE INDEX "NotificationReceipt_userId_readAt_idx" ON "NotificationReceipt"("userId", "readAt");

ALTER TABLE "NotificationReceipt"
ADD CONSTRAINT "NotificationReceipt_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationReceipt"
ADD CONSTRAINT "NotificationReceipt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing direct-user notification reads are migrated so users do not see old read items become unread.
INSERT INTO "NotificationReceipt" ("notificationId", "userId", "readAt")
SELECT "id", "recipientUserId", "readAt"
FROM "Notification"
WHERE "recipientUserId" IS NOT NULL
  AND "readAt" IS NOT NULL
ON CONFLICT ("notificationId", "userId") DO NOTHING;
