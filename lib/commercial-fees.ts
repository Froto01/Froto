export type FeeRuleInput = {
  feeKind: "PERCENTAGE" | "FIXED" | "PERCENTAGE_WITH_LIMITS";
  percentageBps?: number | null;
  fixedAmountMinor?: bigint | null;
  minimumAmountMinor?: bigint | null;
  maximumAmountMinor?: bigint | null;
};

export type FeeCalculationResult = {
  amountMinor: bigint;
  basisAmountMinor: bigint;
  calculation: {
    feeKind: FeeRuleInput["feeKind"];
    percentageBps: number | null;
    fixedAmountMinor: string | null;
    minimumAmountMinor: string | null;
    maximumAmountMinor: string | null;
  };
};

function clamp(value: bigint, minimum?: bigint | null, maximum?: bigint | null) {
  let result = value;
  if (minimum !== null && minimum !== undefined && result < minimum) result = minimum;
  if (maximum !== null && maximum !== undefined && result > maximum) result = maximum;
  return result;
}

function percentageAmount(grossAmountMinor: bigint, percentageBps: number) {
  if (!Number.isInteger(percentageBps) || percentageBps < 0) {
    throw new Error("percentageBps must be a non-negative integer.");
  }

  // Basis points are hundredths of a percent. Integer arithmetic keeps money exact.
  // Add half the denominator for conventional half-up rounding to the nearest cent.
  const denominator = BigInt(10_000);
  const numerator = grossAmountMinor * BigInt(percentageBps);
  return (numerator + denominator / BigInt(2)) / denominator;
}

export function calculatePlatformFeeMinor(
  grossAmountMinor: bigint,
  rule: FeeRuleInput
): FeeCalculationResult {
  if (grossAmountMinor < BigInt(0)) {
    throw new Error("grossAmountMinor cannot be negative.");
  }

  let amountMinor: bigint;

  if (rule.feeKind === "FIXED") {
    if (rule.fixedAmountMinor === null || rule.fixedAmountMinor === undefined) {
      throw new Error("A FIXED fee rule requires fixedAmountMinor.");
    }
    amountMinor = rule.fixedAmountMinor;
  } else {
    if (rule.percentageBps === null || rule.percentageBps === undefined) {
      throw new Error(`${rule.feeKind} requires percentageBps.`);
    }
    amountMinor = percentageAmount(grossAmountMinor, rule.percentageBps);
  }

  if (amountMinor < BigInt(0)) {
    throw new Error("Calculated fee cannot be negative.");
  }

  if (rule.feeKind === "PERCENTAGE_WITH_LIMITS") {
    amountMinor = clamp(amountMinor, rule.minimumAmountMinor, rule.maximumAmountMinor);
  }

  return {
    amountMinor,
    basisAmountMinor: grossAmountMinor,
    calculation: {
      feeKind: rule.feeKind,
      percentageBps: rule.percentageBps ?? null,
      fixedAmountMinor: rule.fixedAmountMinor?.toString() ?? null,
      minimumAmountMinor: rule.minimumAmountMinor?.toString() ?? null,
      maximumAmountMinor: rule.maximumAmountMinor?.toString() ?? null,
    },
  };
}

export function isFeeRuleComplete(rule: FeeRuleInput) {
  if (rule.feeKind === "FIXED") {
    return rule.fixedAmountMinor !== null && rule.fixedAmountMinor !== undefined;
  }

  if (rule.feeKind === "PERCENTAGE") {
    return rule.percentageBps !== null && rule.percentageBps !== undefined;
  }

  return (
    rule.percentageBps !== null &&
    rule.percentageBps !== undefined &&
    (rule.minimumAmountMinor === null ||
      rule.minimumAmountMinor === undefined ||
      rule.maximumAmountMinor === null ||
      rule.maximumAmountMinor === undefined ||
      rule.minimumAmountMinor <= rule.maximumAmountMinor)
  );
}
