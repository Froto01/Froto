/**
 * Read-only, UI-neutral contract for company job-count reporting.
 * Callers MUST prove full query coverage before passing "complete".
 * This module does not infer user actions or payments from job states.
 */
const COVERAGE = new Set(["complete", "partial", "unknown"]);

export function summarizeCompanyJobRecords({ companyId, jobs, coverage = "unknown" }) {
  if (typeof companyId !== "string" || companyId.trim() === "") {
    throw new TypeError("A company ID is required");
  }
  if (!Array.isArray(jobs) || !COVERAGE.has(coverage)) {
    throw new TypeError("Expected job records and explicit source coverage");
  }

  const unique = new Map();
  for (const job of jobs) {
    if (
      !job || typeof job.id !== "string" || !job.id ||
      typeof job.buyerCompanyId !== "string" ||
      typeof job.providerCompanyId !== "string" ||
      typeof job.status !== "string"
    ) {
      throw new TypeError("Invalid job record");
    }
    if (job.buyerCompanyId !== companyId && job.providerCompanyId !== companyId) continue;
    const prior = unique.get(job.id);
    if (
      prior && (
        prior.buyerCompanyId !== job.buyerCompanyId ||
        prior.providerCompanyId !== job.providerCompanyId ||
        prior.status !== job.status
      )
    ) {
      throw new Error("Conflicting job records cannot be reconciled");
    }
    unique.set(job.id, job);
  }

  // These values cannot be inferred from Job.amount, Job.status or a fee estimate.
  const financials = { paidAmount: null, earnedAmount: null, settledAmount: null };
  if (coverage !== "complete") {
    return {
      coverage, participatingJobs: null, buyerJobs: null,
      supplierJobs: null, completedJobs: null, cancelledJobs: null,
      financials,
    };
  }

  const records = [...unique.values()];
  return {
    coverage,
    participatingJobs: records.length,
    buyerJobs: records.filter((job) => job.buyerCompanyId === companyId).length,
    supplierJobs: records.filter((job) => job.providerCompanyId === companyId).length,
    completedJobs: records.filter((job) => job.status === "COMPLETED").length,
    cancelledJobs: records.filter((job) => job.status === "CANCELLED").length,
    financials,
  };
}
