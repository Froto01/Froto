import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./marketplace-directions.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiled = { exports: {} };
new Function("module", "exports", js)(compiled, compiled.exports);
const { marketplaceDirections } = compiled.exports;
const layout = readFileSync(new URL("../app/platform/layout.tsx", import.meta.url), "utf8");

test("four existing routes remain distinct", () => {
  assert.equal(marketplaceDirections.length, 4);
  assert.equal(new Set(marketplaceDirections.map((direction) => direction.href)).size, 4);
});
test("transport and storage requirements are buying paths", () => {
  const buying = marketplaceDirections.filter((direction) => direction.transactionSide === "Buying");
  assert.equal(buying.length, 3);
  assert.ok(buying.some((direction) => direction.href === "/platform/spot-requirements/new?type=transport"));
  assert.ok(buying.some((direction) => direction.href === "/platform/spot-requirements/new?type=storage"));
});
test("supplier route lists capacity rather than posting a buying requirement", () => {
  const supplying = marketplaceDirections.filter((direction) => direction.transactionSide === "Supplying");
  assert.equal(supplying.length, 1);
  assert.equal(supplying[0].href, "/platform/listings/new");
  assert.match(supplying[0].description, /buyers to bid/);
});
test("tender is a buying requirement and keeps private supplier responses", () => {
  const tender = marketplaceDirections.find((direction) => direction.href === "/platform/tenders/new");
  assert.equal(tender?.transactionSide, "Buying");
  assert.match(tender.description, /procurement/);
  assert.match(tender.description, /privately/);
});
test("directions never assert Froto is the transport provider", () => {
  for (const direction of marketplaceDirections) {
    assert.ok(direction.label.trim());
    assert.ok(direction.badge.trim());
    assert.ok(direction.description.trim());
    assert.doesNotMatch(direction.description, /Froto (will |does )?(transport|deliver|store)/i);
  }
});
test("layout exposes side badges, labelled links, keyboard focus and shared routes", () => {
  assert.ok(layout.includes('import { marketplaceDirections } from "@/lib/marketplace-directions";'));
  assert.ok(layout.includes('direction.transactionSide === "Buying"'));
  assert.ok(layout.includes('aria-label={`${direction.transactionSide}: ${direction.label}`}'));
  assert.ok(layout.includes("focus-visible:outline"));
  assert.ok(!layout.includes("const marketplaceDirections = ["));
});
