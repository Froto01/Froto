import assert from "node:assert/strict";
import test from "node:test";

import { calculateTransactionFee } from "./fee-engine.mjs";

const marginal = (amount, overrides = {}) => calculateTransactionFee({
  transactionAmountCents: amount, percentageBps: 1000,
  minimumFeeCents: 1000, maximumFeeCents: null, gstBps: 1000,
  policyCode: 'FROTO_MARKETPLACE_MARGINAL', policyVersion: 1, ...overrides,
});

test('marginal tiers match agreed examples and every threshold to the cent', () => {
  for (const [amount, fee] of [[0,1000],[9999,1000],[10000,1000],[24999,2500],[25000,2500],[25001,2500],[25008,2501],[40000,3550],[49999,4250],[50000,4250],[50001,4250],[50010,4251],[150000,9250],[199999,11750],[200000,11750],[200001,11750],[200017,11751],[500000,20750],[1754000,58370]]) {
    assert.equal(marginal(amount).feeExGstCents, fee, `job cents ${amount}`);
  }
  const job = marginal(40000);
  assert.equal(job.gstCents,355);assert.equal(job.feeIncGstCents,3905);
  assert.equal(marginal(1754000).gstCents,5837);
});
test('marginal policy never drops at a threshold and rounds after summing tiers', () => {
  for(const threshold of [25000,50000,200000]) {
    let prior = marginal(threshold-20).feeExGstCents;
    for(let amount=threshold-19;amount<=threshold+20;amount++) {
      const next=marginal(amount).feeExGstCents;assert.ok(next>=prior);prior=next;
    }
  }
});
test('all three marginal rule codes have the same economics', () => {
  for(const policyCode of ['FROTO_MARKETPLACE_MARGINAL','FROTO_TENDER_MARGINAL','FROTO_GUEST_MARGINAL'])assert.equal(marginal(40000,{policyCode}).feeExGstCents,3550);
});
test('marginal rule versions and inconsistent configuration fail closed', () => {
  for(const overrides of [{policyVersion:2},{percentageBps:300},{minimumFeeCents:0},{maximumFeeCents:50000},{gstBps:0},{policyCode:'FROTO_UNKNOWN_MARGINAL'}])assert.throws(()=>marginal(40000,overrides),/policy/);
  assert.throws(()=>marginal(Number.MAX_SAFE_INTEGER+1),/safe integer/);
});

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

test("calculates the approved guest auction provider fee", () => {
  const guestJob = calculateTransactionFee({
    transactionAmountCents: 150_000,
    percentageBps: 300,
    minimumFeeCents: 1_000,
    maximumFeeCents: 50_000,
    gstBps: 1000,
  });

  assert.equal(guestJob.percentageFeeCents, 4_500);
  assert.equal(guestJob.feeExGstCents, 4_500);
  assert.equal(guestJob.gstCents, 450);
  assert.equal(guestJob.feeIncGstCents, 4_950);
});
