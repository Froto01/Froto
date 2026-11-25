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
async function renderDirections() {
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
  const cache = new Map();
  const dependencies = new Set([
    "react", "react/jsx-runtime", "lucide-react", "@radix-ui/react-slot",
    "class-variance-authority", "clsx", "tailwind-merge",
  ]);
  function load(id) {
    if (id === "next/link") return ({ children, ...props }) => React.createElement("a", props, children);
    if (id === "next/navigation") return { usePathname: () => "/platform" };
    if (dependencies.has(id)) return nativeRequire(id);
    if (!Object.hasOwn(compiledSources, id)) throw new Error("Unexpected layout import: " + id);
    if (cache.has(id)) return cache.get(id).exports;
    const compiled = { exports: {} };
    cache.set(id, compiled);
    new Function("module", "exports", "require", compiledSources[id])(compiled, compiled.exports, load);
    return compiled.exports;
  }
  return renderToStaticMarkup(React.createElement(load("layout").default));
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
