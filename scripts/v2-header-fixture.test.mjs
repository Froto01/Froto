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
