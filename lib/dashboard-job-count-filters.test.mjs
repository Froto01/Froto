import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDashboardJobCountFilters } from "./dashboard-job-count-filters.ts";

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
