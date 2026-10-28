import { checkUatEnvironment, UAT_APP_ORIGIN } from '../../lib/uat-safety.cjs';
import type { Browser, Page, TestInfo, Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { authFile, email, type Actor, readManifest, writeManifest, fixtureTitle } from './environment';

export async function signedPage(browser: Browser, actor: Actor) {
  const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = test.info().project.use;
  const context = await browser.newContext({ viewport, userAgent, isMobile, hasTouch, deviceScaleFactor, baseURL: UAT_APP_ORIGIN, timezoneId: 'Australia/Brisbane' });
  context.setDefaultTimeout(15000); context.setDefaultNavigationTimeout(30000);
  if (browser.browserType().name() === 'webkit') {
    if (checkUatEnvironment().length) throw new Error('Owned development fixture environment required');
    // Fixture compatibility: narrow only Clerk's localhost timestamp cookie.
    // Its real value/flags and signed credential cookies are unchanged.
    await context.addInitScript(({ origin }) => {
      const native = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      if (!native?.get || !native.set) throw new Error('Native cookie API unavailable');
      Object.defineProperty(Document.prototype, 'cookie', {
        configurable: native.configurable, enumerable: native.enumerable,
        get: native.get,
        set(value: string) {
          const name = value.slice(0, value.indexOf('=')).trim();
          if (location.origin === origin && /^__client_uat(?:_[A-Za-z0-9_-]+)?$/.test(name)) {
            value = value.replace(/;\s*domain\s*=\s*\.?localhost(?=;|$)/ig, '');
          }
          native.set!.call(this, value);
        },
      });
    }, { origin: UAT_APP_ORIGIN });
    test.info().annotations.push({ type: 'fixture-bootstrap', description: 'WebKit localhost: Clerk client-update timestamp writes are host-only, with SDK values/flags preserved. Signed credential cookies untouched. Not native sign-in/email/MFA acceptance.' });
  }
  await setupClerkTestingToken({ context });
  const page = await context.newPage();
  try {
    await establishSession(page, actor);
    await context.storageState({ path: authFile(actor) });
  } catch(error) {
    const location = new URL(page.url());
    const capture = location.origin === UAT_APP_ORIGIN && !location.search ? await page.screenshot().catch(()=>null) : null;
    if(capture) await test.info().attach(`auth-${test.info().project.name}-${actor}`, { body: capture, contentType: 'image/png' });
    await context.close(); throw error;
  }
  return { context, page };
}

// Keep Clerk's development-session hand-off inside the browser. Never return or
// log the decorated URL: it may contain transient authentication credentials.
export async function establishSession(page: Page, actor: Actor) {
  let serverStatus = 0;
  let stage = 'load';
  const destination = actor === 'guest' ? '/platform/guest-auctions' : '/platform/dashboard';
  const serverReady = async () => {
    stage = 'server session';
    await expect.poll(async () => {
      try { serverStatus = await page.evaluate(async () => (await fetch('/api/guest-auctions', { cache: 'no-store' })).status); }
      catch { serverStatus = 0; }
      return serverStatus;
    }, { timeout: 30000 }).toBe(200);
  };
  try {
    await page.goto('/auth-test');
    stage = 'official Clerk test identity';
    await clerk.signIn({ page, emailAddress: email(actor) });
    stage = 'development document hand-off';
    await page.evaluate(() => {
      const sdk = (window as unknown as { Clerk: { buildUrlWithAuth(to: string): string } }).Clerk;
      window.location.assign(sdk.buildUrlWithAuth('/start'));
    }).catch(() => { /* Document navigation may replace this context; readiness below must pass. */ });
    await serverReady();
    stage = 'server navigation';
    await page.goto('/start');
    stage = 'local destination';
    // Boolean readiness keeps decorated URLs out of assertion errors/artifacts.
    await expect.poll(() => {
      const url = new URL(page.url());
      return url.origin === UAT_APP_ORIGIN && url.pathname === destination && !url.search;
    }, { timeout: 30000 }).toBe(true);
    await serverReady();
  } catch {
    // Raw navigation errors can include the SDK's transient authentication URL.
    const url = new URL(page.url());
    const local = url.origin === UAT_APP_ORIGIN;
    const destinationReached = local && url.pathname === destination;
    const diagnostic = local ? await page.evaluate(async () => ({
      clientSignedIn: Boolean((window as unknown as { Clerk?: { session?: unknown } }).Clerk?.session),
      localSessionCookiePresent: document.cookie.split(';').some(item => /^\s*__session(?:_[^=]+)?=/.test(item)),
      secureContext: window.isSecureContext,
      serverStatus: await fetch('/api/guest-auctions', { cache: 'no-store' }).then(r => r.status).catch(() => 0),
    })).catch(() => null) : null;
    // Only booleans/status codes leave the browser, never cookie contents or IDs.
    throw new Error(`Owned development sign-in failed at ${stage} (HTTP ${serverStatus}, local=${local}, expectedPage=${destinationReached}, diagnostics=${JSON.stringify(diagnostic)}); authentication URLs and credentials redacted.`);
  }
}

export async function api(page: Page, path: string, body?: unknown) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { path, body });
}

export async function screenshot(page: Page, info: TestInfo, name: string) {
  await info.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
}

export async function createGuestJob(page: Page) {
  const manifest = readManifest();
  const title = fixtureTitle(`guest ${manifest.auctions.length + 1}`);
  await page.goto('/platform/guest-auctions');
  await page.getByPlaceholder('Job title', { exact: true }).fill(title);
  await page.getByPlaceholder('Describe the item(s), size, weight and handling needs').fill('Two simulated packed boxes; no transport required.');
  await page.getByPlaceholder('Pickup location', { exact: true }).fill('Brisbane QLD');
  await page.getByPlaceholder('Delivery location', { exact: true }).fill('Gold Coast QLD');
  await page.getByLabel('Auction closes').fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await page.getByPlaceholder('Optional notes', { exact: true }).fill(manifest.runId);
  const pending = page.waitForResponse(r => r.url().endsWith('/api/guest-auctions') && r.request().method() === 'POST');
  await activate(page.getByRole('button', { name: 'Post silent-auction job' }));
  const response = await pending;
  expect(response.status()).toBe(201);
  const result = await response.json();
  manifest.auctions.push(result.id);
  writeManifest(manifest);
  await page.goto(`/platform/guest-auctions/${result.id}`);
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  return result.id as string;
}

export async function bid(page: Page, auctionId: string, amount: number, privateNote: string) {
  await page.goto(`/platform/guest-auctions/${auctionId}`);
  await page.getByPlaceholder('Your total price (AUD)').fill(String(amount));
  await page.getByPlaceholder("Describe your service and what's included").fill(privateNote);
  await page.getByPlaceholder('Lead time / timing').fill('Simulated next-day service');
  const pending = page.waitForResponse(r => r.url().endsWith(`/guest-auctions/${auctionId}/bids`) && r.request().method() === 'POST');
  await activate(page.getByRole('button', { name: 'Submit sealed bid' }));
  const response = await pending;
  expect(response.status()).toBe(201);
  const result = await response.json();
  await expect(page.getByText('Your submitted offer')).toBeVisible();
  return result.id as string;
}

export async function activate(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  let previous = ''; let stable = 0;
  await expect.poll(async () => {
    const box = await target.boundingBox();
    if (!box) return false;
    const current = [box.x, box.y, box.width, box.height].map(Math.round).join(',');
    stable = current === previous ? stable + 1 : 0; previous = current;
    return stable >= 3;
  }, { timeout: 10000, intervals: [100] }).toBe(true);
  // Normal touch input retains hit-testing; no forced click or synthetic handler dispatch.
  if (test.info().project.use.isMobile) await target.tap(); else await target.click();
}
