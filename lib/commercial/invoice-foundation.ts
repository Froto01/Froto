export type InvoiceDraftInput = {
  invoiceType: "CUSTOMER_TRANSACTION" | "FROTO_FEE" | "PROMOTION" | "CREDIT_NOTE" | "RECEIPT";
  subtotalMinor: bigint;
  taxAmountMinor?: bigint;
  currency?: string;
  dueAt?: Date | null;
  externalReference?: string | null;
};

export type InvoiceDraft = {
  invoiceType: InvoiceDraftInput["invoiceType"];
  status: "DRAFT";
  subtotalMinor: bigint;
  taxAmountMinor: bigint;
  totalMinor: bigint;
  currency: string;
  dueAt: Date | null;
  externalReference: string | null;
};

export function buildInvoiceDraft(input: InvoiceDraftInput): InvoiceDraft {
  const taxAmountMinor = input.taxAmountMinor ?? BigInt(0);

  if (input.subtotalMinor < BigInt(0) || taxAmountMinor < BigInt(0)) {
    throw new Error("Invoice amounts cannot be negative.");
  }

  return {
    invoiceType: input.invoiceType,
    status: "DRAFT",
    subtotalMinor: input.subtotalMinor,
    taxAmountMinor,
    totalMinor: input.subtotalMinor + taxAmountMinor,
    currency: (input.currency ?? "AUD").toUpperCase(),
    dueAt: input.dueAt ?? null,
    externalReference: input.externalReference ?? null,
  };
}
