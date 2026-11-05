import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./capacity-listing-validation.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const compiled = { exports: {} };
new Function("module", "exports", outputText)(compiled, compiled.exports);
const { copyCapacityListingForNewListing, validateCapacityListing } = compiled.exports;

const original = {
  listingType: "Transport Lane",
  title: "Brisbane to Gold Coast",
  location: "",
  origin: "Brisbane",
  destination: "Gold Coast",
  capacityAmount: "22",
  capacityUnit: "pallets",
  temperatureClass: "ambient",
  availableFrom: "2026-11-09",
  availableTo: "2026-11-10",
  startingBid: "100",
  minimumBidIncrement: "5",
  biddingClosesAt: "2026-11-08T10:00",
  notes: "Tail-lift required",
};

test("new listing copy keeps descriptive details without mutating original", () => {
  const snapshot = structuredClone(original);
  const copy = copyCapacityListingForNewListing(original);
  for (const field of ["listingType", "title", "origin", "destination", "capacityAmount", "capacityUnit", "temperatureClass", "notes"]) {
    assert.equal(copy[field], original[field], field);
  }
  assert.deepEqual(original, snapshot);
  assert.notStrictEqual(copy, original);
});

test("copy never carries stale dates or commercial bid values", () => {
  const copy = copyCapacityListingForNewListing(original);
  for (const field of ["availableFrom", "availableTo", "biddingClosesAt", "startingBid", "minimumBidIncrement"]) {
    assert.equal(copy[field], "", field);
  }
  assert.match(validateCapacityListing(copy, Date.parse("2026-11-06T00:00:00Z")), /Starting bid|increment|availability|close/i);
});

test("warehouse listing copy retains storage location but clears its dates and bids", () => {
  const copy = copyCapacityListingForNewListing({
    ...original,
    listingType: "Warehouse Space",
    origin: "",
    destination: "",
    location: "Brisbane QLD",
  });
  assert.equal(copy.location, "Brisbane QLD");
  assert.equal(copy.listingType, "Warehouse Space");
  assert.equal(copy.availableFrom, "");
  assert.equal(copy.biddingClosesAt, "");
  assert.equal(copy.minimumBidIncrement, "");
});

test("success screen offers explicit unpublished copy and retains review-before-publish protection", () => {
  const page = readFileSync(new URL("../app/platform/listings/new/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Create similar listing/);
  assert.match(page, /setForm\(copyCapacityListingForNewListing\(submittedListing\)\)/);
  assert.match(page, /setSubmittedListing\(null\);\s*setReviewedForm\(null\);\s*setError\(null\);/);
  assert.match(page, /new, unpublished form/);
  assert.match(page, /re-enter availability/i);
  assert.match(page, /validateCapacityListing\(form, Date\.now\(\)\)/);
  assert.ok(page.indexOf("setReviewedForm({ ...form })") < page.indexOf("await createListing({"));
});
