import assert from "node:assert/strict";
import test from "node:test";

import { calculateTransactionFee } from "./fee-engine.mjs";

test("calculates percentage fee and GST", () => {
  const result = calculateTransactionFee({
    transactionAmountCents: 120_000,
    percentageBps: 250,
    gstBps: 1000,
  });

  assert.equal(result.percentageFeeCents, 3_000);
  assert.equal(result.feeExGstCents, 3_000);
  assert.equal(result.gstCents, 300);
  assert.equal(result.feeIncGstCents, 3_300);
});

test("applies minimum fee before GST", () => {
  const result = calculateTransactionFee({
    transactionAmountCents: 10_000,
    percentageBps: 100,
    minimumFeeCents: 500,
    gstBps: 1000,
  });

  assert.equal(result.percentageFeeCents, 100);
  assert.equal(result.feeExGstCents, 500);
  assert.equal(result.gstCents, 50);
  assert.equal(result.feeIncGstCents, 550);
});

test("applies maximum fee before GST", () => {
  const result = calculateTransactionFee({
    transactionAmountCents: 10_000_000,
    percentageBps: 500,
    maximumFeeCents: 25_000,
    gstBps: 1000,
  });

  assert.equal(result.percentageFeeCents, 500_000);
  assert.equal(result.feeExGstCents, 25_000);
  assert.equal(result.gstCents, 2_500);
  assert.equal(result.feeIncGstCents, 27_500);
});

test("rounds half up to the nearest cent", () => {
  const result = calculateTransactionFee({
    transactionAmountCents: 101,
    percentageBps: 50,
    gstBps: 0,
  });

  assert.equal(result.percentageFeeCents, 1);
  assert.equal(result.feeExGstCents, 1);
});

test("supports zero percentage without inventing a charge", () => {
  const result = calculateTransactionFee({
    transactionAmountCents: 120_000,
    percentageBps: 0,
    gstBps: 1000,
  });

  assert.equal(result.feeExGstCents, 0);
  assert.equal(result.gstCents, 0);
  assert.equal(result.feeIncGstCents, 0);
});

test("rejects invalid minimum and maximum configuration", () => {
  assert.throws(
    () =>
      calculateTransactionFee({
        transactionAmountCents: 100_000,
        percentageBps: 100,
        minimumFeeCents: 2_000,
        maximumFeeCents: 1_000,
      }),
    /minimumFeeCents cannot be greater than maximumFeeCents/
  );
});


test("matches the approved launch fee examples", () => {
  const smallJob = calculateTransactionFee({
    transactionAmountCents: 18_500,
    percentageBps: 300,
    minimumFeeCents: 1_000,
    maximumFeeCents: 50_000,
    gstBps: 1000,
  });

  assert.equal(smallJob.feeExGstCents, 1_000);
  assert.equal(smallJob.gstCents, 100);
  assert.equal(smallJob.feeIncGstCents, 1_100);

  const cappedJob = calculateTransactionFee({
    transactionAmountCents: 1_754_000,
    percentageBps: 300,
    minimumFeeCents: 1_000,
    maximumFeeCents: 50_000,
    gstBps: 1000,
  });

  assert.equal(cappedJob.percentageFeeCents, 52_620);
  assert.equal(cappedJob.feeExGstCents, 50_000);
  assert.equal(cappedJob.gstCents, 5_000);
  assert.equal(cappedJob.feeIncGstCents, 55_000);
});
