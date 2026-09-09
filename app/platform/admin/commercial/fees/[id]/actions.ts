"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
import { billingEvent } from "@/lib/fee-billing";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function recordBilling(previous: { message: string }, form: FormData) {
  const admin = await requirePlatformAdmin();
  const id = String(form.get("feeId") ?? "");
  const fee = await prisma.transactionFee.findUnique({ where: { id } });
  if (!fee) return { message: "Fee not found." };
  const metadata = fee.metadata && typeof fee.metadata === "object" && !Array.isArray(fee.metadata) ? fee.metadata : {};
  const history = Array.isArray(metadata.billingHistory) ? metadata.billingHistory : [];
  const previousDate = fee.invoicedAt ?? fee.earnedAt;
  if (!previousDate) return { message: "Only earned fees can enter billing." };
  let event;
  try {
    event = billingEvent({
      action: String(form.get("action") ?? ""), status: fee.status,
      reference: String(form.get("reference") ?? ""), date: String(form.get("date") ?? ""),
      amount: String(form.get("amount") ?? ""), feeIncGst: fee.feeIncGst.toFixed(2),
      earliestDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(previousDate),
      actorUserId: admin.id, confirmed: form.get("confirmed") === "on",
    });
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Check the billing details." };
  }
  // A conditional write makes competing submissions and stale forms harmless.
  // The historical snapshot and the billing event change atomically in one row.
  const result = await prisma.transactionFee.updateMany({
    where: { id, status: fee.status, updatedAt: fee.updatedAt },
    data: {
      status: event.action,
      ...(event.action === "INVOICED"
        ? { invoicedAt: new Date(`${event.date}T12:00:00+10:00`) }
        : { paidAt: new Date(`${event.date}T12:00:00+10:00`), paymentProvider: "MANUAL", paymentProviderReference: event.reference }),
      metadata: { ...metadata, billingHistory: [...history, event] } as Prisma.InputJsonValue,
    },
  });
  if (result.count !== 1) return { message: "This fee changed during submission. Refresh and check its history." };
  revalidatePath("/platform/admin/commercial");
  revalidatePath(`/platform/admin/commercial/fees/${id}`);
  return { message: event.action === "PAID" ? "Full payment recorded." : "Issued invoice recorded." };
}
