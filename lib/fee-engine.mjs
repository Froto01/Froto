function assertInteger(name, value) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be a safe integer.`);
  }
}

// A policy code/version is immutable. Never change these tiers in place.
const marginalCodes = new Set([
  "FROTO_MARKETPLACE_MARGINAL", "FROTO_TENDER_MARGINAL", "FROTO_GUEST_MARGINAL",
]);
const marginalTiers = Object.freeze([
  Object.freeze({ upperLimitCents: 25_000, percentageBps: 1000 }),
  Object.freeze({ upperLimitCents: 50_000, percentageBps: 700 }),
  Object.freeze({ upperLimitCents: 200_000, percentageBps: 500 }),
  Object.freeze({ upperLimitCents: null, percentageBps: 300 }),
]);

function assertNonNegative(name, value) {
  assertInteger(name, value);
  if (value < 0) {
    throw new RangeError(`${name} must be zero or greater.`);
  }
}

/**
 * Calculate a Froto transaction fee using integer cents and basis points.
 * Minimum and maximum values apply to the fee before GST.
 *
 * @param {{
 *   transactionAmountCents: number,
 *   percentageBps: number,
 *   minimumFeeCents?: number | null,
 *   maximumFeeCents?: number | null,
 *   gstBps?: number,
 *   policyCode?: string,
 *   policyVersion?: number,
 * }} input
 */
export function calculateTransactionFee(input) {
  const {
    transactionAmountCents,
    percentageBps,
    minimumFeeCents = null,
    maximumFeeCents = null,
    gstBps = 1000,
    policyCode,
    policyVersion,
  } = input;

  assertNonNegative("transactionAmountCents", transactionAmountCents);
  assertNonNegative("percentageBps", percentageBps);
  assertNonNegative("gstBps", gstBps);

  if (minimumFeeCents !== null) {
    assertNonNegative("minimumFeeCents", minimumFeeCents);
  }

  if (maximumFeeCents !== null) {
    assertNonNegative("maximumFeeCents", maximumFeeCents);
  }

  if (
    minimumFeeCents !== null &&
    maximumFeeCents !== null &&
    minimumFeeCents > maximumFeeCents
  ) {
    throw new RangeError("minimumFeeCents cannot be greater than maximumFeeCents.");
  }

  const marginal = marginalCodes.has(policyCode);
  if (policyCode?.startsWith("FROTO_") && policyCode.includes("MARGINAL") && !marginal) {
    throw new RangeError("Unknown marginal fee policy.");
  }
  if (marginal && (policyVersion !== 1 || percentageBps !== 1000 || minimumFeeCents !== 1000 || maximumFeeCents !== null || gstBps !== 1000)) {
    throw new RangeError("Marginal fee policy requires v1, first-tier 1000 bps, $10 minimum, no cap and 10% GST.");
  }
  // Sum exact tier contributions, then round once, matching the workbook.
  let numerator = 0n;
  if (marginal) {
    let lower = 0;
    for (const tier of marginalTiers) {
      const portion = Math.max(0, Math.min(transactionAmountCents, tier.upperLimitCents ?? transactionAmountCents) - lower);
      numerator += BigInt(portion) * BigInt(tier.percentageBps);
      lower = tier.upperLimitCents ?? transactionAmountCents;
    }
  } else {
    numerator = BigInt(transactionAmountCents) * BigInt(percentageBps);
  }
  const exactFee = (numerator + 5000n) / 10000n;
  if (exactFee > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Fee exceeds supported range.");
  const percentageFeeCents = Number(exactFee);

  let feeExGstCents = percentageFeeCents;

  if (minimumFeeCents !== null) {
    feeExGstCents = Math.max(feeExGstCents, minimumFeeCents);
  }

  if (maximumFeeCents !== null) {
    feeExGstCents = Math.min(feeExGstCents, maximumFeeCents);
  }

  const exactGst = (BigInt(feeExGstCents) * BigInt(gstBps) + 5000n) / 10000n;
  if (exactGst > BigInt(Number.MAX_SAFE_INTEGER - feeExGstCents)) throw new RangeError("Fee including GST exceeds supported range.");
  const gstCents = Number(exactGst);
  const feeIncGstCents = feeExGstCents + gstCents;

  return {
    transactionAmountCents,
    percentageBps,
    percentageFeeCents,
    minimumFeeCents,
    maximumFeeCents,
    gstBps,
    feeExGstCents,
    gstCents,
    feeIncGstCents,
    ...(marginal ? { marginalTiers: marginalTiers.map(tier => ({ ...tier })) } : {}),
  };
}
