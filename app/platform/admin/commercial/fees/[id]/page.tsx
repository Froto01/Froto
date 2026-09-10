import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
import { BillingForm } from "./billing-form";

export default async function FeeBillingPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const fee = await prisma.transactionFee.findUnique({ where: { id } });
  if (!fee) notFound();
  const [payer, job] = await Promise.all([
    fee.payerCompanyId ? prisma.company.findUnique({ where: { id: fee.payerCompanyId } }) : null,
    prisma.job.findUnique({ where: { id: fee.sourceId }, include: { listing: true, tender: true } }),
  ]);
  const metadata = fee.metadata && typeof fee.metadata === "object" && !Array.isArray(fee.metadata) ? fee.metadata : {};
  const history = Array.isArray(metadata.billingHistory) ? metadata.billingHistory : [];
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-froto-navy">
    <Link href="/platform/admin/commercial" className="text-froto-blue">← Commercial performance</Link>
    <h1 className="text-2xl font-semibold">Billing: {job?.listing?.title ?? job?.tender?.title ?? fee.transactionType}</h1>
    <div className="space-y-2 rounded-2xl bg-slate-50 p-5">
      <p>Payer: <strong>{payer?.name ?? fee.payerUserId ?? "Unassigned"}</strong></p>
      <p>Status: <strong>{fee.status}</strong></p>
      <p>Fee ${fee.feeExGst.toFixed(2)} + GST ${fee.gstAmount.toFixed(2)} = <strong>AUD ${fee.feeIncGst.toFixed(2)}</strong></p>
      <p className="text-sm">Outstanding including GST: ${["EARNED", "INVOICED"].includes(fee.status) ? fee.feeIncGst.toFixed(2) : "0.00"}</p>
    </div>
    <BillingForm key={fee.status} feeId={fee.id} status={fee.status} amount={fee.feeIncGst.toFixed(2)} />
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Billing history</h2>
      {history.length === 0 && <p>No invoice or payment recorded.</p>}
      {history.map((entry, index) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
        return <div key={index} className="rounded-xl border p-4 text-sm">
          <p className="font-semibold">{String(entry.action)} · {String(entry.reference)}</p>
          <p>{String(entry.date)} · AUD ${String(entry.amount)} including GST</p>
          <p className="mt-2 text-slate-500">Recorded {String(entry.recordedAt)} by user {String(entry.actorUserId)}</p>
        </div>;
      })}
    </section>
  </main>;
}
