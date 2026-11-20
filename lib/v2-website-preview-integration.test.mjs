import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const market = read("app/platform/page.tsx");
const layout = read("app/platform/layout.tsx");
const header = read("components/public-brand-header.tsx");
const listing = read("app/platform/listings/new/page.tsx");
const dashboard = read("app/platform/dashboard/page.tsx");
const business = read("app/platform/activity/page.tsx");
const vercel = JSON.parse(read("vercel.json"));

test("candidate preserves one original brand logo and accessible shared marketplace controls", () => {
  assert.equal(header.split('/brand/froto-logo.svg').length - 1, 1);
  assert.equal(market.includes("froto-logo.svg"), false);
  assert.equal(market.includes("<header"), false);
  assert.match(market, /id="opportunity-search"/);
  assert.match(market, /aria-pressed=/);
  assert.match(market, /Live supply chain spot market/);
});
test("candidate keeps compact rows, expiry-aware actions and private offers", () => {
  assert.match(market, /aria-label="Available transport and storage capacity"/);
  assert.match(market, /aria-label="Open transport and storage requirements"/);
  assert.match(market, /listingBiddingState/);
  assert.match(market, /Private offers/);
});
test("candidate retains business role paths, listing review/drafts and reporting pages", () => {
  assert.match(layout, /direction\.transactionSide === "Buying"/);
  assert.match(listing, /Save draft on this browser/);
  assert.match(listing, /Restore saved draft/);
  assert.match(listing, /Create similar listing/);
  assert.match(dashboard, /platform\/activity/);
  assert.match(business, /listingPage/);
});
test("candidate and reporting base explicitly disable automatic Vercel deployment", () => {
  assert.equal(vercel.git.deploymentEnabled["feature/v2-reporting-contract-20261110"], false);
  assert.equal(vercel.git.deploymentEnabled["feature/v2-integrated-preview-20261117"], false);
});

test("integrated dashboard retains one shared branding surface", () => {
  const root = read("app/layout.tsx");
  assert.equal((root.match(/<PublicBrandHeader\s*\/>/g) ?? []).length, 1);
  assert.doesNotMatch(dashboard, /<header\b|\/brand\/froto-(?:logo|mark)\.svg/);
  assert.match(dashboard, /<h1[^>]*>\{company\.name\}<\/h1>/);
  assert.match(dashboard, /href="\/platform\/activity"/);
});


test("integrated My Business uses the shared logo/header while retaining management controls", () => {
  assert.doesNotMatch(business, /<header\b|\/brand\/froto-(?:logo|mark)\.svg/);
  assert.match(business, /<h1[^>]*>\{company\.name\}<\/h1>/);
  assert.match(business, /href="\/platform\/dashboard"/);
  assert.match(business, /listingPage/);
  assert.match(business, /requirementPage/);
});
