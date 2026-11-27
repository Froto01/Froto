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

test("My Business tender history uses a complete tenant count, deterministic pages and independent navigation", () => {
  const source = readFileSync(new URL("../app/platform/activity/page.tsx", import.meta.url), "utf8");
  assert.match(source, /tenderPage\?: string/);
  assert.match(source, /tenderPagination = listingPage\(tenderPageParam, allTenderCount\)/);
  assert.match(source, /prisma\.tender\.count\(\{ where: \{ companyId: company\.id \} \}\)/);
  assert.match(source, /prisma\.tender\.findMany\(\{[\s\S]*?where: \{ companyId: company\.id \},[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\],[\s\S]*?skip: tenderPagination\.skip,[\s\S]*?take: tenderPagination\.take/);
  assert.match(source, /aria-label="My Tenders pagination"/);
  assert.match(source, /listingPage=\$\{listingPagination\.page\}&tenderPage=\$\{tenderPagination\.page - 1\}&requirementPage=\$\{requirementPagination\.page\}#tenders/);
  assert.match(source, /listingPage=\$\{listingPagination\.page - 1\}&tenderPage=\$\{tenderPagination\.page\}&requirementPage=\$\{requirementPagination\.page\}#listings/);
  assert.doesNotMatch(source, /Search and pagination for older records are not available yet/);
});
test("My Business requirements have complete company counts, stable 25-row pages and independent navigation", () => {
  const source = readFileSync(new URL("../app/platform/activity/page.tsx", import.meta.url), "utf8");
  for (const required of [
    "requirementPage?: string",
    "prisma.spotRequirement.count({ where: { companyId: company.id } })",
    "requirementPagination = listingPage(requirementPageParam, allRequirementCount)",
    'orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: requirementPagination.skip',
    "take: requirementPagination.take",
    'aria-label="My Requirements pagination"',
    "of {allRequirementCount} customer requirements",
    "&requirementPage=",
    "#spot-requirements",
  ]) assert.ok(source.includes(required), "Missing requirement pagination contract: " + required);
  assert.ok(!source.includes("prisma.spotRequirement.findMany({ where: { companyId: company.id }, orderBy: { createdAt: \"desc\" }"));
  assert.ok(source.includes("&requirementPage=" + "$" + "{requirementPagination.page}#listings"));
});
test("Requirement pagination bounds: empty, 101 records and malformed pages", () => {
  assert.equal(listingPage("1", 0).start, 0);
  assert.deepEqual(listingPage("5", 101), { page: 5, pageCount: 5, skip: 100, take: 25, start: 101, end: 101 });
  assert.equal(listingPage("8", 101).page, 5);
  assert.equal(listingPage("-1", 101).page, 1);
});

test("Tender response counts match Dashboard scope and pages retain own-company predicate", () => {
  const source = readFileSync(new URL("../app/platform/activity/page.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../app/platform/dashboard/page.tsx", import.meta.url), "utf8");
  const count = 'prisma.tenderResponse.count({ where: { companyId: company.id } })';
  assert.ok(source.includes(count));
  assert.ok(dashboard.includes(count));
  const query = source.split("prisma.tenderResponse.findMany(")[1].split("prisma.job.findMany(")[0];
  assert.match(query, /where: \{ companyId: company\.id \}/);
  assert.match(query, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(query, /skip: responsePagination\.skip/);
  assert.match(query, /take: responsePagination\.take/);
  assert.doesNotMatch(query, /take: 100/);
  assert.ok(source.includes("responsePagination = listingPage(responsePageParam, allResponseCount)"));
  assert.ok(source.includes("of {allResponseCount} tender responses"));
});
test("Tender response pages preserve other selection state and anchor", () => {
  const source = readFileSync(new URL("../app/platform/activity/page.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-label="My Tender Responses pagination"/);
  for (const delta of [" - 1", " + 1"]) {
    assert.ok(source.includes("listingView=" + "$" + "{listingFilter.view}&responsePage=" + "$" + "{responsePagination.page" + delta + "}&listingPage=" + "$" + "{listingPagination.page}&tenderPage=" + "$" + "{tenderPagination.page}&requirementPage=" + "$" + "{requirementPagination.page}#awards"));
  }
  const otherPages = source.split("\n").filter(line => /#(?:listings|tenders|spot-requirements)/.test(line) && /Previous page|Next page|Filter my listings|All listings|Active listings/.test(line));
  assert.ok(otherPages.length >= 8);
  for (const line of otherPages) assert.ok(line.includes("responsePage=" + "$" + "{responsePagination.page}"));
});
test("Tender response paging handles 0, 1, 25, 26 and 101 records without losing older responses", () => {
  for (const count of [0, 1, 25, 26, 101]) {
    const records = Array.from({ length: count }, (_, i) => ({ id: String(i).padStart(3, "0"), companyId: "a", status: count === 101 && i === 0 ? "AWARDED" : "SUBMITTED" }));
    const all = [...records, { id: "other", companyId: "b", status: "AWARDED" }];
    const own = all.filter(record => record.companyId === "a").sort((a, b) => b.id.localeCompare(a.id));
    const { pageCount } = listingPage("1", own.length);
    const seen = Array.from({ length: pageCount }, (_, i) => {
      const page = listingPage(String(i + 1), own.length);
      return own.slice(page.skip, page.skip + page.take);
    }).flat();
    assert.deepEqual(seen, own);
    assert.equal(new Set(seen.map(record => record.id)).size, count);
    assert.equal(seen.filter(record => record.status === "AWARDED").length, count === 101 ? 1 : 0);
    if (count === 101) {
      assert.equal(own.slice(0, 25).filter(record => record.status === "AWARDED").length, 0);
      assert.equal(seen.at(-1).status, "AWARDED");
    }
  }
});
test("Tender response award total is not reduced by paging; aggregate award coverage remains explicit", () => {
  const source = readFileSync(new URL("../app/platform/activity/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('prisma.tenderResponse.count({ where: { companyId: company.id, status: "AWARDED" } })'));
  assert.doesNotMatch(source, /wonTenderResponses = tenderResponses\.filter/);
  assert.ok(source.includes("Awards won (partial)"));
  assert.ok(source.includes("All awarded tender responses plus awards in the loaded bid and guest records only."));
});
