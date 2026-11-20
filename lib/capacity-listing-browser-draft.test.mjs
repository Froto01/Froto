import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadModule(file, requireDependency = () => {
  throw new Error("Unexpected dependency");
}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loadedModule = { exports: {} };
  new Function("module", "exports", "require", outputText)(
    loadedModule, loadedModule.exports, requireDependency,
  );
  return loadedModule.exports;
}
const units = loadModule("./logistics-units.ts");
const {
  saveCapacityBrowserDraft, readCapacityBrowserDraft, discardCapacityBrowserDraft,
} = loadModule("./capacity-listing-browser-draft.ts", (id) => {
  if (id === "./logistics-units") return units;
  throw new Error("Unexpected dependency: " + id);
});

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

const now = Date.parse("2026-11-07T00:00:00.000Z");
const example = {
  listingType: "Transport Lane",
  title: "Brisbane to Gold Coast",
  location: "",
  origin: "Brisbane QLD",
  destination: "Gold Coast QLD",
  capacityAmount: "22",
  capacityUnit: "pallets",
  temperatureClass: "ambient",
  notes: "Tail-lift required",
  availableFrom: "2026-11-09",
  availableTo: "2026-11-10",
  biddingClosesAt: "2026-11-08T09:00",
  startingBid: "100",
  minimumBidIncrement: "5",
};

test("explicit save retains only descriptive fields; never dates or commercial terms", () => {
  const store = storage();
  const before = structuredClone(example);
  saveCapacityBrowserDraft(store, "user_123", example, now);
  const saved = [...store.values.values()][0];
  for (const unsafeField of ["availableFrom", "availableTo", "biddingClosesAt", "startingBid", "minimumBidIncrement"]) {
    assert.ok(!saved.includes(unsafeField), unsafeField);
  }
  const result = readCapacityBrowserDraft(store, "user_123", now + 1000);
  assert.equal(result.details.title, example.title);
  assert.equal(result.details.notes, example.notes);
  assert.equal(result.details.capacityUnit, "pallets");
  assert.equal(result.details.startingBid, undefined);
  assert.equal(result.savedAt, new Date(now).toISOString());
  assert.deepEqual(example, before);
});

test("browser draft is scoped to the Clerk user key", () => {
  const store = storage();
  saveCapacityBrowserDraft(store, "user_A", example, now);
  assert.equal(readCapacityBrowserDraft(store, "user_B", now), null);
  assert.equal(readCapacityBrowserDraft(store, "user_A", now).details.origin, "Brisbane QLD");
});

test("saved draft expires after thirty days", () => {
  const store = storage();
  saveCapacityBrowserDraft(store, "user_A", example, now);
  assert.ok(readCapacityBrowserDraft(store, "user_A", now + 29 * 86400000));
  assert.equal(readCapacityBrowserDraft(store, "user_A", now + 31 * 86400000), null);
  assert.equal(store.values.size, 0, "expired record should be deleted");
});

test("corrupted, future-dated or malformed drafts fail closed", () => {
  const store = storage();
  saveCapacityBrowserDraft(store, "user_A", example, now);
  const key = [...store.values.keys()][0];
  store.setItem(key, "invalid json");
  assert.equal(readCapacityBrowserDraft(store, "user_A", now), null);

  saveCapacityBrowserDraft(store, "user_A", example, now + 10000);
  assert.equal(readCapacityBrowserDraft(store, "user_A", now), null);
  saveCapacityBrowserDraft(store, "user_A", example, now);
  const malformed = JSON.parse(store.getItem(key));
  malformed.details.capacityUnit = "not-a-real-unit";
  store.setItem(key, JSON.stringify(malformed));
  assert.equal(readCapacityBrowserDraft(store, "user_A", now), null);
});

test("storage errors, missing identity, oversized notes are handled without publication", () => {
  const store = storage();
  assert.throws(() => saveCapacityBrowserDraft(store, "", example, now), /sign in/i);
  assert.throws(() => saveCapacityBrowserDraft(store, "user_A", { ...example, notes: "x".repeat(5000) }, now), /check/i);
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
  assert.equal(readCapacityBrowserDraft(blocked, "user_A", now), null);
  assert.throws(() => saveCapacityBrowserDraft(blocked, "user_A", example, now), /blocked/);
});

test("discard removes only the selected user's draft", () => {
  const store = storage();
  saveCapacityBrowserDraft(store, "user_A", example, now);
  saveCapacityBrowserDraft(store, "user_B", example, now);
  discardCapacityBrowserDraft(store, "user_A");
  assert.equal(readCapacityBrowserDraft(store, "user_A", now), null);
  assert.ok(readCapacityBrowserDraft(store, "user_B", now));
});

test("UI retains explicit opt-in, revalidation, review and no automatic publishing", () => {
  const page = readFileSync(new URL("../app/platform/listings/new/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Save draft on this browser/);
  assert.match(page, /Restore saved draft/);
  assert.match(page, /Discard saved draft/);
  assert.match(page, /readCapacityBrowserDraft/);
  assert.match(page, /setForm\(\{ \.\.\.emptyListing, \.\.\.saved.details \}\)/);
  assert.match(page, /setReviewedForm\(null\)/);
  assert.match(page, /validateCapacityListing\(form, Date\.now\(\)\)/);
  assert.match(page, /await createListing\(/);
  assert.match(page, /discardCapacityBrowserDraft/);
  assert.match(page, /not shared across devices/i);
});

test("restore confirmation protects unsaved form fields before applying saved details", () => {
  const page = readFileSync(new URL("../app/platform/listings/new/page.tsx", import.meta.url), "utf8");
  const restore = page.match(/function restoreBrowserDraft\(\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(restore, "restore handler exists");
  assert.match(restore, /Object\.keys\(form\)\.some\(/);
  assert.match(restore, /hasEnteredDetails && !window\.confirm\(/);
  assert.match(restore, /Restore cancelled\. Your current listing details were not changed\./);
  assert.ok(restore.indexOf("window.confirm(") < restore.indexOf("setForm({ ...emptyListing, ...saved.details })"));
  assert.ok(restore.indexOf("readCapacityBrowserDraft(") < restore.indexOf("window.confirm("));
});

test("saving over an existing browser draft requires confirmation before writing", () => {
  const page = readFileSync(new URL("../app/platform/listings/new/page.tsx", import.meta.url), "utf8");
  const save = page.match(/function saveBrowserDraft\(\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(save, "save handler exists");
  assert.match(save, /readCapacityBrowserDraft\(window\.localStorage, userId\)/);
  assert.match(save, /existing && !window\.confirm\(/);
  assert.match(save, /Save cancelled\. Your earlier browser draft was not changed\./);
  assert.ok(save.indexOf("readCapacityBrowserDraft(") < save.indexOf("window.confirm("));
  assert.ok(save.indexOf("window.confirm(") < save.indexOf("saveCapacityBrowserDraft("));
});
