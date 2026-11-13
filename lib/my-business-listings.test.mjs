import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companyListingView, listingPage } from "./my-business-listings.ts";
test("all and active filters stay scoped to the selected company", () => {
  assert.deepEqual(companyListingView("a", "all"), { view: "all", where: { companyId: "a" } });
  assert.deepEqual(companyListingView("a", "active"), { view: "active", where: { companyId: "a", status: "ACTIVE" } });
  assert.deepEqual(companyListingView("a", "cancelled"), { view: "all", where: { companyId: "a" } });
  assert.throws(() => companyListingView("", "active"), /Company ID/);
});
test("0, 1, and 101 records have exact bounded pages", () => {
  assert.deepEqual(listingPage("1", 0), { page: 1, pageCount: 1, skip: 0, take: 25, start: 0, end: 0 });
  assert.deepEqual(listingPage("1", 1), { page: 1, pageCount: 1, skip: 0, take: 25, start: 1, end: 1 });
  assert.deepEqual(listingPage("5", 101), { page: 5, pageCount: 5, skip: 100, take: 25, start: 101, end: 101 });
});
test("untrusted page arguments never create unbounded skips", () => {
  for (const bad of ["0", "-2", "3.2", "9999999", ["2"], null]) assert.equal(listingPage(bad, 101).page, 1);
  assert.equal(listingPage("999999", 101).page, 5);
  assert.throws(() => listingPage("1", -1), /count/);
});
test("My Business applies the same filter to counts and stable paginated rows", () => {
  const source = readFileSync(new URL("../app/platform/activity/page.tsx", import.meta.url), "utf8");
  assert.match(source, /searchParams: Promise/);
  assert.match(source, /companyListingView\(company\.id, listingView\)/);
  assert.match(source, /prisma\.listing\.count\(\{ where: listingFilter\.where \}\)/);
  assert.match(source, /where: listingFilter\.where,[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\],[\s\S]*?skip: listingPagination\.skip,[\s\S]*?take: listingPagination\.take/);
  assert.match(source, /aria-label="My Listings pagination"/);
});
test("Dashboard active count links to its matching My Business view", () => {
  const source = readFileSync(new URL("../app/platform/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(source, /label: "Active listings"[^\n]*href: "\/platform\/activity\?listingView=active#listings"/);
});
