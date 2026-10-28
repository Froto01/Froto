import type { Browser, Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';
import { authFile, type Actor, readManifest, writeManifest } from './environment';

export async function signedPage(browser: Browser, actor: Actor) {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100', timezoneId: 'Australia/Brisbane', storageState: authFile(actor) });
  return { context, page: await context.newPage() };
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
  const title = `SIMULATED ${manifest.runId} ${manifest.auctions.length + 1}`;
  await page.goto('/platform/guest-auctions');
  await page.getByPlaceholder('Job title', { exact: true }).fill(title);
  await page.getByPlaceholder('Describe the item(s), size, weight and handling needs').fill('Two simulated packed boxes; no transport required.');
  await page.getByPlaceholder('Pickup location', { exact: true }).fill('Brisbane QLD');
  await page.getByPlaceholder('Delivery location', { exact: true }).fill('Gold Coast QLD');
  await page.getByLabel('Auction closes').fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await page.getByPlaceholder('Optional notes', { exact: true }).fill(manifest.runId);
  const pending = page.waitForResponse(r => r.url().endsWith('/api/guest-auctions') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Post silent-auction job' }).click();
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
  await page.getByRole('button', { name: 'Submit sealed bid' }).click();
  const response = await pending;
  expect(response.status()).toBe(201);
  const result = await response.json();
  await expect(page.getByText('Your submitted offer')).toBeVisible();
  return result.id as string;
}
