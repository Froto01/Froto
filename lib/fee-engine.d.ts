export type TransactionFeeInput = {
  transactionAmountCents: number;
  percentageBps: number;
  minimumFeeCents?: number | null;
  maximumFeeCents?: number | null;
  gstBps?: number;
};

export type TransactionFeeCalculation = {
  transactionAmountCents: number;
  percentageBps: number;
  percentageFeeCents: number;
  minimumFeeCents: number | null;
  maximumFeeCents: number | null;
  gstBps: number;
  feeExGstCents: number;
  gstCents: number;
  feeIncGstCents: number;
};

export function calculateTransactionFee(
  input: TransactionFeeInput
): TransactionFeeCalculation;
