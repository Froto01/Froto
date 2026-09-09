"use client";

import { useActionState } from "react";
import { recordBilling } from "./actions";

export function BillingForm({ feeId, status, amount }: { feeId: string; status: string; amount: string }) {
  const [state, action, pending] = useActionState(recordBilling, { message: "" });
  if (!["EARNED", "INVOICED"].includes(status)) return <p role="status">{state.message}</p>;
  const invoice = status === "EARNED";
  return <form action={action} className="space-y-4 rounded-2xl border border-slate-200 p-5">
    <h2 className="text-xl font-semibold">{invoice ? "Record issued invoice" : "Record full payment"}</h2>
    <p className="text-sm text-slate-600">{invoice ? "Record an invoice already issued through your billing system. This form does not create or send an invoice." : "Record money received against this fee after checking your bank or payment provider. This form does not charge the payer."}</p>
    <input type="hidden" name="feeId" value={feeId} />
    <input type="hidden" name="action" value={invoice ? "INVOICED" : "PAID"} />
    <label className="block">{invoice ? "Invoice reference" : "Bank or payment reference"}<input name="reference" required maxLength={120} className="mt-1 block w-full rounded border p-2" /></label>
    <label className="block">{invoice ? "Invoice date" : "Payment received date"} (Brisbane)<input type="date" name="date" required className="mt-1 block rounded border p-2" /></label>
    <label className="block">{invoice ? "Invoice" : "Received"} amount including GST (AUD)<input name="amount" inputMode="decimal" required defaultValue={amount} className="mt-1 block rounded border p-2" /></label>
    <label className="flex items-start gap-2"><input type="checkbox" name="confirmed" required className="mt-1" /><span>{invoice ? "I confirm this invoice has been issued for this fee." : "I confirm the full amount has been received and reconciled to this fee."}</span></label>
    <button disabled={pending} className="rounded-lg bg-froto-navy px-4 py-2 text-white disabled:opacity-50">{pending ? "Saving…" : invoice ? "Record invoice" : "Record payment"}</button>
    <p role="status" className="text-sm">{state.message}</p>
  </form>;
}
