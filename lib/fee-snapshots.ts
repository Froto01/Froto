import type { Prisma } from "@/lib/generated/prisma/client";

import { calculateTransactionFee } from "@/lib/fee-engine.mjs";

type JobFeeTransactionType = "MARKETPLACE_JOB" | "TENDER_JOB";

type CreateJobFeeSnapshotInput = {
  tx: Prisma.TransactionClient;
  transactionType: JobFeeTransactionType;
  sourceId: string;
  transactionAmount: { toString(): string };
  buyerCompanyId: string;
  providerCompanyId: string;
  calculatedAt: Date;
  metadata?: Record<string, string | number | boolean | null>;
};

function decimalToCents(value: { toString(): string } | null): number | null {
  if (value === null) return null;

  const raw = value.toString().trim();
  const match = raw.match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error(`Unsupported currency value: ${raw}`);
  }

  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = dollars * 100 + cents;

  if (!Number.isSafeInteger(total)) {
    throw new Error("Currency value exceeds the supported fee-calculation range.");
  }

  return total;
}

function centsToDecimal(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${dollars}.${remainder.toString().padStart(2, "0")}`;
}

export async function createJobFeeSnapshotIfApplicable({
  tx,
  transactionType,
  sourceId,
  transactionAmount,
  buyerCompanyId,
  providerCompanyId,
  calculatedAt,
  metadata,
}: CreateJobFeeSnapshotInput) {
  const rules = await tx.feeRule.findMany({
    where: {
      transactionType,
      active: true,
      AND: [
        {
          OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: calculatedAt } }],
        },
        {
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: calculatedAt } }],
        },
      ],
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    take: 2,
  });

  if (rules.length === 0) return null;

  if (rules.length > 1) {
    throw new Error(`Multiple active ${transactionType} fee rules apply to this award.`);
  }

  const rule = rules[0];

  let payerCompanyId: string;
  if (rule.payerType === "BUYER") {
    payerCompanyId = buyerCompanyId;
  } else if (rule.payerType === "PROVIDER") {
    payerCompanyId = providerCompanyId;
  } else {
    throw new Error(
      `${transactionType} fee rule ${rule.code} v${rule.version} must use BUYER or PROVIDER as payer.`
    );
  }

  const transactionAmountCents = decimalToCents(transactionAmount);
  if (transactionAmountCents === null) {
    throw new Error("Transaction amount is required for a job fee snapshot.");
  }

  const minimumFeeCents = decimalToCents(rule.minimumFee);
  const maximumFeeCents = decimalToCents(rule.maximumFee);
  const calculated = calculateTransactionFee({
    transactionAmountCents,
    percentageBps: rule.percentageBps,
    minimumFeeCents,
    maximumFeeCents,
    gstBps: rule.gstBps,
  });

  const idempotencyKey = `${transactionType}:${sourceId}`;

  return tx.transactionFee.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      idempotencyKey,
      feeRuleId: rule.id,
      feeRuleCode: rule.code,
      feeRuleVersion: rule.version,
      transactionType,
      sourceId,
      payerType: rule.payerType,
      payerCompanyId,
      transactionAmount: transactionAmount.toString(),
      percentageBps: rule.percentageBps,
      minimumFee: rule.minimumFee,
      maximumFee: rule.maximumFee,
      gstBps: rule.gstBps,
      feeExGst: centsToDecimal(calculated.feeExGstCents),
      gstAmount: centsToDecimal(calculated.gstCents),
      feeIncGst: centsToDecimal(calculated.feeIncGstCents),
      calculatedAt,
      metadata: metadata ?? undefined,
    },
  });
}
