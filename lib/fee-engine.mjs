function assertInteger(name, value) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer.`);
  }
}

function assertNonNegative(name, value) {
  assertInteger(name, value);
  if (value < 0) {
    throw new RangeError(`${name} must be zero or greater.`);
  }
}

function roundHalfUp(numerator, denominator) {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
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
 * }} input
 */
export function calculateTransactionFee(input) {
  const {
    transactionAmountCents,
    percentageBps,
    minimumFeeCents = null,
    maximumFeeCents = null,
    gstBps = 1000,
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

  const percentageFeeCents = roundHalfUp(
    transactionAmountCents * percentageBps,
    10_000
  );

  let feeExGstCents = percentageFeeCents;

  if (minimumFeeCents !== null) {
    feeExGstCents = Math.max(feeExGstCents, minimumFeeCents);
  }

  if (maximumFeeCents !== null) {
    feeExGstCents = Math.min(feeExGstCents, maximumFeeCents);
  }

  const gstCents = roundHalfUp(feeExGstCents * gstBps, 10_000);
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
  };
}
