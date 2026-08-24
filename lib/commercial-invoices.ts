export type DraftInvoiceInput = {
  invoiceType: "CUSTOMER_TRANSACTION" | "FROTO_FEE" | "PROMOTION" | "CREDIT_NOTE" | "RECEIPT";
  subtotalMinor: bigint;
  taxAmountMinor?: bigint;
  currency?: string;
  dueAt?: Date | null;
  metadata?: Record<string, unknown> | null;
};

export type DraftInvoiceRecord = {
  invoiceType: DraftInvoiceInput["invoiceType"];
  status: "DRAFT";
  subtotalMinor: bigint;
  taxAmountMinor: bigint;
  totalMinor: bigint;
  currency: string;
  dueAt: Date | null;
  metadata: Record<string, unknown> | null;
};

export function buildDraftInvoiceRecord(input: DraftInvoiceInput): DraftInvoiceRecord {
  const taxAmountMinor = input.taxAmountMinor ?? BigInt(0);

  if (input.subtotalMinor < BigInt(0) && input.invoiceType !== "CREDIT_NOTE") {
    throw new Error("Invoice subtotal cannot be negative unless the record is a credit note.");
  }

  if (taxAmountMinor < BigInt(0) && input.invoiceType !== "CREDIT_NOTE") {
    throw new Error("Invoice tax cannot be negative unless the record is a credit note.");
  }

  return {
    invoiceType: input.invoiceType,
    status: "DRAFT",
    subtotalMinor: input.subtotalMinor,
    taxAmountMinor,
    totalMinor: input.subtotalMinor + taxAmountMinor,
    currency: input.currency ?? "AUD",
    dueAt: input.dueAt ?? null,
    metadata: input.metadata ?? null,
  };
}

export function canIssueInvoice(args: {
  invoiceNumber: string | null | undefined;
  legalIssuerConfirmed: boolean;
  taxTreatmentConfirmed: boolean;
}) {
  return Boolean(
    args.invoiceNumber?.trim() && args.legalIssuerConfirmed && args.taxTreatmentConfirmed
  );
}
