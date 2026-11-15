import test from "node:test";
import assert from "node:assert/strict";
import { summarizeCompanyJobRecords as summarize } from "./business-reporting-contract.mjs";

const job = (id, buyerCompanyId, providerCompanyId, status = "AWARDED") =>
  ({ id, buyerCompanyId, providerCompanyId, status });

test("unknown coverage never turns a capped query into complete totals", () => {
  const result = summarize({ companyId: "a", jobs: [job("1", "a", "b")], coverage: "unknown" });
  assert.equal(result.participatingJobs, null);
  assert.equal(result.completedJobs, null);
  assert.equal(result.supplierJobs, null);
});
test("partial coverage cannot report zero when rows happen to be empty", () => {
  const result = summarize({ companyId: "a", jobs: [], coverage: "partial" });
  assert.equal(result.participatingJobs, null);
});
test("verified complete empty query reports genuine zero counts", () => {
  const result = summarize({ companyId: "a", jobs: [], coverage: "complete" });
  assert.equal(result.participatingJobs, 0);
  assert.equal(result.completedJobs, 0);
});
test("counts only the selected company's jobs, buyer and supplier separately", () => {
  const result = summarize({ companyId: "a", coverage: "complete", jobs: [
    job("1", "a", "b"), job("2", "c", "a", "COMPLETED"), job("3", "c", "d")
  ] });
  assert.deepEqual(
    [result.participatingJobs, result.buyerJobs, result.supplierJobs, result.completedJobs],
    [2, 1, 1, 1],
  );
});
test("duplicates and a company on both sides cannot inflate participating totals", () => {
  const both = job("1", "a", "a", "COMPLETED");
  const result = summarize({ companyId: "a", coverage: "complete", jobs: [both, both] });
  assert.equal(result.participatingJobs, 1);
  assert.equal(result.buyerJobs, 1);
  assert.equal(result.supplierJobs, 1);
  assert.equal(result.completedJobs, 1);
});
test("conflicting duplicates fail closed rather than creating misleading counts", () => {
  assert.throws(() => summarize({ companyId: "a", coverage: "complete", jobs: [
    job("1", "a", "b"), job("1", "a", "b", "COMPLETED")
  ] }), /Conflicting/);
});
test("cancelled and in-progress records are not completed or attention claims", () => {
  const result = summarize({ companyId: "a", coverage: "complete", jobs: [
    job("1", "a", "b", "CANCELLED"), job("2", "a", "b", "IN_PROGRESS")
  ] });
  assert.equal(result.completedJobs, 0);
  assert.equal(result.cancelledJobs, 1);
  assert.equal(Object.hasOwn(result, "attentionJobs"), false);
});
test("never labels agreed amounts or fee snapshots as paid, earned or settled", () => {
  const result = summarize({ companyId: "a", coverage: "complete", jobs: [
    { ...job("1", "a", "b", "COMPLETED"), amount: "300.00" }
  ] });
  assert.deepEqual(result.financials, { paidAmount: null, earnedAmount: null, settledAmount: null });
});
test("invalid inputs are rejected instead of accidentally displaying a total", () => {
  assert.throws(() => summarize({ companyId: "", jobs: [], coverage: "complete" }), /company ID/);
  assert.throws(() => summarize({ companyId: "a", jobs: [], coverage: "full" }), /coverage/);
  assert.throws(() => summarize({ companyId: "a", jobs: [{ id: "1" }], coverage: "complete" }), /Invalid/);
});
