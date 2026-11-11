import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDashboardJobCountFilters, buildOpenBidListingCountFilter } from "./dashboard-job-count-filters.ts";

const filters = (id = "company-a") => buildDashboardJobCountFilters(id);
const job = (id, buyer, provider, status = "AWARDED") => ({ id, buyerCompanyId: buyer, providerCompanyId: provider, status });
// Synthetic predicate checks filter intent; not a database, auth or UI integration test.
function matches(record, where) {
  const side = where.OR
    ? where.OR.some((part) => Object.entries(part).every(([key, value]) => record[key] === value))
    : Object.entries(where).filter(([key]) => key !== "status").every(([key, value]) => record[key] === value);
  if (!side) return false;
  if (typeof where.status === "string") return record.status === where.status;
  if (where.status?.notIn?.includes(record.status)) return false;
  if (where.status?.not === record.status) return false;
  return true;
}

test("requires an explicit company and never widens to all tenants", () => {
  assert.throws(() => filters(" "), /company ID/);
  const query = filters();
  assert.deepEqual(query.unfinished.OR, [
    { buyerCompanyId: "company-a" }, { providerCompanyId: "company-a" },
  ]);
  assert.deepEqual(query.providerJobs.providerCompanyId, "company-a");
});

test("unfinished excludes both completed and cancelled, unlike not COMPLETED", () => {
  const jobs = [
    job("active", "company-a", "other", "IN_PROGRESS"),
    job("award", "other", "company-a"),
    job("complete", "company-a", "other", "COMPLETED"),
    job("cancel", "company-a", "other", "CANCELLED"),
    job("foreign", "other", "third"),
  ];
  assert.deepEqual(jobs.filter((j) => matches(j, filters().unfinished)).map((j) => j.id), ["active", "award"]);
});

test("provider job count cannot accidentally count buyer-only jobs", () => {
  const jobs = [
    job("buyer", "company-a", "other"),
    job("provider", "other", "company-a"),
    job("complete-provider", "other", "company-a", "COMPLETED"),
    job("cancel-provider", "other", "company-a", "CANCELLED"),
    job("foreign", "other", "third"),
  ];
  assert.deepEqual(jobs.filter((j) => matches(j, filters().providerJobs)).map((j) => j.id), ["provider", "complete-provider"]);
});

test("a dual-sided job is one record, and completed counts both participating sides", () => {
  const jobs = [
    job("dual", "company-a", "company-a", "COMPLETED"),
    job("provider", "other", "company-a", "COMPLETED"),
    job("foreign", "other", "third", "COMPLETED"),
  ];
  assert.equal(jobs.filter((j) => matches(j, filters().completed)).length, 2);
  assert.equal(jobs.filter((j) => matches(j, filters().providerJobs)).length, 2);
});

test("dashboard queries use the same company-scoped filters and accurate labels", () => {
  const source = readFileSync(new URL("../app/platform/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(source, /buildDashboardJobCountFilters\(company\.id\)/);
  assert.match(source, /prisma\.job\.count\(\{ where: jobCountFilters\.unfinished \}\)/);
  assert.match(source, /prisma\.job\.count\(\{ where: jobCountFilters\.providerJobs \}\)/);
  assert.match(source, /prisma\.job\.count\(\{ where: jobCountFilters\.completed \}\)/);
  assert.match(source, /label: "Provider jobs"/);
  assert.doesNotMatch(source, /label: "Jobs won"/);
});

const openSnapshot = new Date("2026-11-12T00:00:00.000Z");

test("open bid listing rule is scoped, distinct per listing, and time-aware", () => {
  assert.deepEqual(buildOpenBidListingCountFilter("company-a", openSnapshot), {
    status: "ACTIVE",
    awardedBidId: null,
    OR: [{ biddingClosesAt: null }, { biddingClosesAt: { gt: openSnapshot } }],
    bids: { some: { bidderCompanyId: "company-a" } },
  });
});

test("open bid listing rule rejects missing tenant or invalid snapshot", () => {
  assert.throws(() => buildOpenBidListingCountFilter("", openSnapshot), /company ID/);
  assert.throws(() => buildOpenBidListingCountFilter("company-a", new Date("invalid")), /snapshot/);
});

test("synthetic open listing matrix: repeat bids count once, expiry boundary excludes closed", () => {
  const query = buildOpenBidListingCountFilter("company-a", openSnapshot);
  const listings = [
    { id: "open", status: "ACTIVE", awardedBidId: null, biddingClosesAt: new Date("2026-11-12T00:01:00Z"), bids: ["company-a", "company-a"] },
    { id: "no-deadline", status: "ACTIVE", awardedBidId: null, biddingClosesAt: null, bids: ["company-a"] },
    { id: "at-boundary", status: "ACTIVE", awardedBidId: null, biddingClosesAt: openSnapshot, bids: ["company-a"] },
    { id: "past", status: "ACTIVE", awardedBidId: null, biddingClosesAt: new Date("2026-11-11T23:59:59Z"), bids: ["company-a"] },
    { id: "awarded", status: "ACTIVE", awardedBidId: "bid-1", biddingClosesAt: null, bids: ["company-a"] },
    { id: "paused", status: "PAUSED", awardedBidId: null, biddingClosesAt: null, bids: ["company-a"] },
    { id: "other-company", status: "ACTIVE", awardedBidId: null, biddingClosesAt: null, bids: ["company-b"] },
  ];
  const matching = listings.filter((listing) =>
    listing.status === query.status &&
    listing.awardedBidId === query.awardedBidId &&
    (listing.biddingClosesAt === null || listing.biddingClosesAt > query.OR[1].biddingClosesAt.gt) &&
    listing.bids.includes(query.bids.some.bidderCompanyId)
  );
  assert.deepEqual(matching.map(({ id }) => id), ["open", "no-deadline"]);
});

test("Dashboard and My Business use the same uncapped listing-count source", () => {
  const dashboard = readFileSync(new URL("../app/platform/dashboard/page.tsx", import.meta.url), "utf8");
  const activity = readFileSync(new URL("../app/platform/activity/page.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /buildOpenBidListingCountFilter\(company\.id, new Date\(\)\)/);
  assert.match(dashboard, /prisma\.listing\.count\(\{ where: openBidListingFilter \}\)/);
  assert.match(activity, /prisma\.listing\.count\(\{\s*where: buildOpenBidListingCountFilter\(company\.id, new Date\(\)\)/);
  assert.match(dashboard, /label: "Open listings bid on"/);
  assert.match(activity, /Open listings bid on/);
  assert.doesNotMatch(activity, /const activeBidListings = new Set/);
});
