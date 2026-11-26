// Isolated browser component acceptance: no Next server, auth, API or database.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { chromium } from "@playwright/test";

const source = await readFile("components/public-brand-header.tsx", "utf8");
const logo = await readFile("public/brand/froto-logo.svg");
const css = (await postcss([tailwindcss({ base: process.cwd() })]).process(
  await readFile("app/globals.css", "utf8"), { from: "app/globals.css" }
)).css;
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  },
}).outputText;
const nativeRequire = createRequire(import.meta.url);
const origin = "https://froto-fixture.invalid";
const out = "v2-header-fixture-results";
await mkdir(out, { recursive: true });

function renderHeader(isSignedIn, pathname) {
  // Substitute only framework wiring; use the exact checked-in JSX and CSS.
  const modules = {
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "next/image": ({ priority, ...props }) => React.createElement("img", {
      ...props, loading: priority ? "eager" : "lazy",
    }),
    "next/navigation": { usePathname: () => pathname },
    "@clerk/nextjs": { useAuth: () => ({ isSignedIn }), SignOutButton: ({ children }) => children },
  };
  const compiled = { exports: {} };
  const requireFixture = (id) => {
    if (Object.hasOwn(modules, id)) return modules[id];
    if (id === "react/jsx-runtime" || id === "react") return nativeRequire(id);
    throw new Error("Unexpected component import: " + id);
  };
  new Function("module", "exports", "require", js)(compiled, compiled.exports, requireFixture);
  return renderToStaticMarkup(React.createElement(compiled.exports.PublicBrandHeader));
}

for (const width of [375, 768, 1440]) {
  for (const isSignedIn of [false, true]) {
    const state = isSignedIn ? "signed-in" : "signed-out";
    test("shared header " + state + " at " + width + "px", async () => {
      const pathname = isSignedIn ? "/platform/dashboard" : "/platform";
      const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body>' + renderHeader(isSignedIn, pathname) + '</body></html>';
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        const unexpected = [];
        // Every browser request is intercepted; only the local fixture and logo
        // receive a response. No application routes or external network calls.
        await page.route("**/*", async (route) => {
          const url = route.request().url();
          if (url === origin + "/") return route.fulfill({ contentType: "text/html", body: html });
          if (url === origin + "/brand/froto-logo.svg") return route.fulfill({ contentType: "image/svg+xml", body: logo });
          unexpected.push(url);
          return route.abort();
        });
        await page.goto(origin + "/", { waitUntil: "load" });
        assert.equal(await page.locator("header").count(), 1);
        assert.equal(await page.locator('img[src="/brand/froto-logo.svg"]').count(), 1);
        assert.ok(await page.locator("header img").evaluate((img) => img.complete && img.naturalWidth > 0));
        const nav = page.getByRole("navigation", { name: "Primary navigation" });
        assert.equal(await nav.locator('[aria-current="page"]').count(), 1);
        assert.equal(await nav.locator('[aria-current="page"]').getAttribute("href"), pathname);
        const links = [
          page.getByRole("link", { name: "Froto home" }),
          nav.getByRole("link", { name: "Marketplace" }),
          ...(isSignedIn ? [
            nav.getByRole("link", { name: "Dashboard" }),
            nav.getByRole("button", { name: "Sign out" }),
          ] : [nav.getByRole("link", { name: "Join / Sign in" })]),
        ];
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
        for (const control of links) {
          const box = await control.boundingBox();
          assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, "Control exceeds viewport");
          await page.keyboard.press("Tab");
          assert.ok(await control.evaluate((el) => el === document.activeElement), "Keyboard focus order");
          const outline = await control.evaluate((el) => {
            const style = getComputedStyle(el);
            return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, visible: el.matches(":focus-visible") };
          });
          assert.ok(outline.visible && outline.width >= 2 && outline.style !== "none", "Visible focus outline");
        }
        assert.deepEqual(unexpected, [], "No non-fixture requests");
        await page.locator("header").screenshot({ path: out + "/" + state + "-" + width + ".png" });
      } finally {
        await browser.close();
      }
    });
  }
}


// Exercise the checked-in marketplace layout and its real UI primitives.
// SSR runs no effects, so guest API calls, redirects and auth are not exercised.
async function renderDirections(rowSource, rowProps) {
  const localPaths = {
    "@/components/ui/badge": "components/ui/badge.tsx",
    "@/components/ui/button": "components/ui/button.tsx",
    "@/components/ui/card": "components/ui/card.tsx",
    "@/lib/utils": "lib/utils.ts",
    "@/lib/marketplace-directions": "lib/marketplace-directions.ts",
    "@/lib/marketplace-availability": "lib/marketplace-availability.ts",
    layout: "app/platform/layout.tsx",
  };
  const compiledSources = Object.fromEntries(await Promise.all(
    Object.entries(localPaths).map(async ([id, path]) => [id, ts.transpileModule(
      await readFile(path, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
        },
      }
    ).outputText])
  ));
  if (rowSource) compiledSources.rows = ts.transpileModule(rowSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const cache = new Map();
  const dependencies = new Set([
    "react", "react/jsx-runtime", "lucide-react", "@radix-ui/react-slot",
    "class-variance-authority", "clsx", "tailwind-merge",
  ]);
  function load(id) {
    if (id === "next/link") return ({ children, ...props }) => React.createElement("a", props, children);
    if (id === "next/navigation") return { usePathname: () => "/platform" };
    if (id === "next/image") return ({ src, ...props }) => React.createElement("img", {
      ...props, src: "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27160%27 height=%27120%27%3E%3Crect width=%27160%27 height=%27120%27 fill=%27%23dbeafe%27/%3E%3C/svg%3E",
    });
    if (dependencies.has(id)) return nativeRequire(id);
    if (!Object.hasOwn(compiledSources, id)) throw new Error("Unexpected layout import: " + id);
    if (cache.has(id)) return cache.get(id).exports;
    const compiled = { exports: {} };
    cache.set(id, compiled);
    new Function("module", "exports", "require", compiledSources[id])(compiled, compiled.exports, load);
    return compiled.exports;
  }
  return renderToStaticMarkup(React.createElement(load(rowSource ? "rows" : "layout").default, rowProps));
}

const directionCases = [
  ["Buying: I need transport", "/platform/spot-requirements/new?type=transport", "Buying"],
  ["Buying: I need storage", "/platform/spot-requirements/new?type=storage", "Buying"],
  ["Supplying: I have spare capacity", "/platform/listings/new", "Supplying"],
  ["Buying: I want supplier quotes", "/platform/tenders/new", "Buying"],
];

for (const [width, columns] of [[375, 1], [768, 2], [1440, 4]]) {
  test("marketplace buying/supplying paths at " + width + "px", async () => {
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body>' + await renderDirections() + '</body></html>';
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const unexpected = [];
      const destinations = new Set(directionCases.map(([, href]) => origin + href));
      await page.route("**/*", async (route) => {
        const url = route.request().url();
        if (url === origin + "/") return route.fulfill({ contentType: "text/html", body: html });
        // Inert destination, not the real form or a live route.
        if (destinations.has(url) && route.request().isNavigationRequest()) {
          return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Fixture destination</title><p>Fixture destination</p>" });
        }
        unexpected.push(url);
        return route.abort();
      });
      await page.goto(origin + "/", { waitUntil: "load" });
      assert.equal(await page.getByRole("link").count(), 4);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      const lefts = [];
      for (const [name, href, side] of directionCases) {
        const link = page.getByRole("link", { name, exact: true });
        assert.equal(await link.getAttribute("href"), href);
        assert.equal(await link.locator('[data-slot="badge"]').innerText(), side);
        const box = await link.boundingBox();
        assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, "Direction exceeds viewport");
        lefts.push(Math.round(box.x));
        await page.keyboard.press("Tab");
        assert.ok(await link.evaluate((el) => el === document.activeElement), "Direction keyboard order");
        const focus = await link.evaluate((el) => {
          const style = getComputedStyle(el);
          return el.matches(":focus-visible") && parseFloat(style.outlineWidth) >= 2 && style.outlineStyle !== "none";
        });
        assert.ok(focus, "Direction has a visible keyboard outline");
      }
      assert.equal(new Set(lefts).size, columns, "Responsive direction grid columns");
      await page.screenshot({ path: out + "/buying-supplying-" + width + ".png", fullPage: true });
      // Activate the final focused card with Enter and assert the intended URL.
      await Promise.all([page.waitForURL(origin + directionCases[3][1]), page.keyboard.press("Enter")]);
      assert.equal(await page.title(), "Fixture destination");
      assert.deepEqual(unexpected, [], "No non-fixture requests");
    } finally {
      await browser.close();
    }
  });
}

 
// Isolate the exact checked-in capacity list JSX (not a rewritten mock row).
// Next Image uses an inert local SVG; no third-party image/network requests.
// The real data fetch, sorting, client hydration and detail-route permissions
// are not exercised here; only synthetic capacity-row presentation is tested.
async function renderCapacityRows(listings, nowMs) {
  const page = await readFile("app/platform/page.tsx", "utf8");
  const start = page.indexOf('<div className="space-y-3" aria-label="Available transport and storage capacity">');
  const closing = "                ))}\n              </div>";
  const end = page.indexOf(closing, start);
  assert.ok(start >= 0 && end > start, "Actual capacity JSX boundaries");
  const helpersStart = page.indexOf("function formatAUD(");
  const helpersEnd = page.indexOf("function FilterSelect(");
  assert.ok(helpersStart >= 0 && helpersEnd > helpersStart, "Actual formatter boundaries");
  const rowSource = [
    'import React from "react";',
    'import Image from "next/image";',
    'import Link from "next/link";',
    'import { ArrowUpRight } from "lucide-react";',
    'import { Badge } from "@/components/ui/badge";',
    'import { Button } from "@/components/ui/button";',
    'import { Card, CardContent } from "@/components/ui/card";',
    'import { listingBiddingState, listingMarketplaceAction } from "@/lib/marketplace-availability";',
    page.slice(helpersStart, helpersEnd),
    'export default function Rows({ filteredListings, nowMs }) { return (',
    page.slice(start, end + closing.length),
    '); }',
  ].join("\n");
  return renderDirections(rowSource, { filteredListings: listings, nowMs });
}

const fixtureNow = Date.parse("2026-11-27T00:00:00Z");
const baseListing = {
  listingType: "Transport Lane", origin: "Brisbane", destination: "Toowoomba",
  capacityAmount: 12, capacityUnit: "pallets", temperatureClass: "Ambient",
  companyName: "Synthetic Supply Co", companyVerified: true, auctionState: "OPEN",
  biddingClosesAt: "2026-11-28T00:00:00Z", currentBid: 250, bidCount: 0,
};
const rowCases = [
  { ...baseListing, id: "fixture-owner", title: "Owner transport capacity", isOwner: true,
    action: "Manage", state: "Bidding open", amountLabel: "Starting bid", bidLabel: "0 bids" },
  { ...baseListing, id: "fixture-bid", title: "Available warehouse space", isOwner: false,
    listingType: "Warehouse Space", location: "Brisbane", capacityAmount: 50, capacityUnit: "pallet spaces",
    bidCount: 1, action: "Bid", state: "Bidding open", amountLabel: "Current bid", bidLabel: "1 bid" },
  { ...baseListing, id: "fixture-expired", title: "Expired transport capacity", isOwner: false,
    biddingClosesAt: "2026-11-27T00:00:00Z", bidCount: 2,
    action: "View", state: "Bidding closed", amountLabel: "Final bid", bidLabel: "2 bids" },
];
for (const width of [375, 768, 1440]) {
  test("compact capacity rows at " + width + "px", async () => {
    const markup = await renderCapacityRows(rowCases, fixtureNow);
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style></head><body><main class="mx-auto max-w-6xl p-4">' + markup + '</main></body></html>';
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const unexpected = [];
      const urls = new Set(rowCases.map(row => origin + "/platform/listing/" + row.id));
      await page.route("**/*", async (route) => {
        const url = route.request().url();
        if (url === origin + "/") return route.fulfill({ contentType: "text/html", body: html });
        if (urls.has(url) && route.request().isNavigationRequest()) return route.fulfill({
          contentType: "text/html", body: "<!doctype html><title>Fixture listing destination</title>",
        });
        unexpected.push(url);
        return route.abort();
      });
      await page.goto(origin + "/", { waitUntil: "load" });
      const list = page.getByLabel("Available transport and storage capacity");
      assert.equal(await list.locator('[data-slot="card"]').count(), rowCases.length);
      assert.equal(await list.getByRole("link").count(), rowCases.length);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      for (const [index, row] of rowCases.entries()) {
        const card = list.locator('[data-slot="card"]').nth(index);
        assert.equal(await card.getByRole("heading", { name: row.title }).count(), 1);
        assert.equal(await card.getByText(row.state, { exact: true }).count(), 1);
        assert.equal(await card.getByText(row.amountLabel, { exact: true }).count(), 1);
        assert.equal(await card.getByText(row.bidLabel, { exact: true }).count(), 1);
        assert.equal(await card.getByText("Your listing", { exact: true }).count(), Number(row.isOwner));
        assert.equal(await card.getByText(row.listingType === "Transport Lane" ? "TRANSPORT AVAILABLE" : "WAREHOUSE SPACE AVAILABLE", { exact: true }).count(), 1);
        assert.ok((await card.innerText()).includes(row.capacityAmount + " " + row.capacityUnit));
        assert.ok((await card.innerText()).includes(row.listingType === "Transport Lane" ? "Brisbane to Toowoomba" : "Brisbane"));
        assert.equal(await card.locator('[data-slot="card-content"]').evaluate(el => getComputedStyle(el).flexDirection), width < 640 ? "column" : "row");
        assert.equal(await card.locator("img").isVisible(), width >= 640);
        const link = card.getByRole("link", { name: row.action + " listing: " + row.title, exact: true });
        assert.equal(await link.getAttribute("href"), "/platform/listing/" + row.id);
        assert.ok((await link.innerText()).trim() === row.action);
        const box = await link.boundingBox();
        assert.ok(box && box.x >= -1 && box.x + box.width <= width + 1, "Row action fits viewport");
        const unfocusedShadow = await link.evaluate(el => getComputedStyle(el).boxShadow);
        await page.keyboard.press("Tab");
        assert.ok(await link.evaluate(el => el === document.activeElement && el.matches(":focus-visible")));
        await link.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
        assert.notEqual(await link.evaluate(el => getComputedStyle(el).boxShadow), unfocusedShadow, "Visible focus ring changes shadow");
      }
      await page.screenshot({ path: out + "/compact-capacity-" + width + ".png", fullPage: true });
      await Promise.all([page.waitForURL(origin + "/platform/listing/fixture-expired"), page.keyboard.press("Enter")]);
      assert.equal(await page.title(), "Fixture listing destination");
      assert.deepEqual(unexpected, [], "No non-fixture requests");
    } finally {
      await browser.close();
    }
  });
}
