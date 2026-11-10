/**
 * Non-financial, tenant-scoped Prisma Job.count filters for dashboard summary.
 * Count each job once, including when buyer and provider are the same company.
 * These are not action-required or payment counts. Status is a String field.
 */
export function buildDashboardJobCountFilters(companyId: string) {
  if (typeof companyId !== "string" || !companyId.trim()) {
    throw new TypeError("A company ID is required");
  }
  const involved = {
    OR: [{ buyerCompanyId: companyId }, { providerCompanyId: companyId }],
  };
  return {
    // Unknown statuses may require additional policy review before being called actionable.
    unfinished: { ...involved, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    // Provider-side only: the buyer is not the supplier who won an award.
    providerJobs: { providerCompanyId: companyId, status: { not: "CANCELLED" } },
    completed: { ...involved, status: "COMPLETED" },
  };
}
