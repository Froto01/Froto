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

/**
 * Count distinct listings a company has bid on which remain open for bidding.
 * Counting Listing records (not Bid rows) prevents repeat bids inflating totals.
 * This is a listing-opportunity metric, not an actionable decision or a payout.
 * Date/time snapshot is explicit so dashboard and My Business can use one rule.
 */
export function buildOpenBidListingCountFilter(companyId: string, asOf: Date) {
  if (typeof companyId !== "string" || !companyId.trim()) {
    throw new TypeError("A company ID is required");
  }
  if (!(asOf instanceof Date) || !Number.isFinite(asOf.getTime())) {
    throw new TypeError("A valid snapshot time is required");
  }
  return {
    status: "ACTIVE",
    awardedBidId: null,
    OR: [{ biddingClosesAt: null }, { biddingClosesAt: { gt: asOf } }],
    bids: { some: { bidderCompanyId: companyId } },
  };
}
