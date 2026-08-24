export type FeeCalculationInput = {
  grossAmountMinor: bigint;
  feeKind: "PERCENTAGE" | "FIXED" | "PERCENTAGE_WITH_LIMITS";
  percentageBps?: number | null;
  fixedAmountMinor?: bigint | null;
  minimumAmountMinor?: bigint | null;
  maximumAmountMinor?: bigint | null;
};

export type FeeCalculationResult = {
  amountMinor: bigint;
  basis: {
    grossAmountMinor: string;
    feeKind: FeeCalculationInput["feeKind"];
    percentageBps: number | null;
    fixedAmountMinor: string | null;
    minimumAmountMinor: string | null;
    maximumAmountMinor: string | null;
  };
};

function applyLimits(
  amount: bigint,
  minimumAmountMinor?: bigint | null,
  maximumAmountMinor?: bigint | null
) {
  let result = amount;

  if (minimumAmountMinor != null && result < minimumAmountMinor) {
    result = minimumAmountMinor;
  }

  if (maximumAmountMinor != null && result > maximumAmountMinor) {
    result = maximumAmountMinor;
  }

  return result;
}

export function calculateFee(input: FeeCalculationInput): FeeCalculationResult {
  if (input.grossAmountMinor < BigInt(0)) {
    throw new Error("Gross transaction amount cannot be negative.");
  }

  let amountMinor: bigint;

  switch (input.feeKind) {
    case "PERCENTAGE":
    case "PERCENTAGE_WITH_LIMITS": {
      if (input.percentageBps == null || input.percentageBps < 0) {
        throw new Error("A non-negative percentage in basis points is required.");
      }

      amountMinor =
        (input.grossAmountMinor * BigInt(input.percentageBps) + BigInt(5000)) /
        BigInt(10000);
      break;
    }
    case "FIXED": {
      if (input.fixedAmountMinor == null || input.fixedAmountMinor < BigInt(0)) {
        throw new Error("A non-negative fixed fee amount is required.");
      }

      amountMinor = input.fixedAmountMinor;
      break;
    }
  }

  if (input.feeKind === "PERCENTAGE_WITH_LIMITS") {
    amountMinor = applyLimits(
      amountMinor,
      input.minimumAmountMinor,
      input.maximumAmountMinor
    );
  }

  return {
    amountMinor,
    basis: {
      grossAmountMinor: input.grossAmountMinor.toString(),
      feeKind: input.feeKind,
      percentageBps: input.percentageBps ?? null,
      fixedAmountMinor: input.fixedAmountMinor?.toString() ?? null,
      minimumAmountMinor: input.minimumAmountMinor?.toString() ?? null,
      maximumAmountMinor: input.maximumAmountMinor?.toString() ?? null,
    },
  };
}
