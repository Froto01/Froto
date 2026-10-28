import { test, expect } from '@playwright/test';
import { db, closeDatabase, companyId, companyName, readManifest, writeManifest, cleanupSuccessfulRun, one, type AuctionRow, type FeeRow, type BidRow } from './environment';
import { api, bid, createGuestJob, screenshot, signedPage } from './helpers';

let failed = false;
test.afterEach(async ({}, info) => { if (info.status !== 'passed') failed = true; });
test.afterAll(async () => { try { if (!failed) await cleanupSuccessfulRun(); } finally { await closeDatabase(); } });

test('signed-out requests cannot read guest jobs or award work', async ({ page }, info) => {
  await page.goto('/auth-test');
  await expect(page.getByRole('heading', { name: 'Welcome to Froto' })).toBeVisible();
  expect((await api(page, '/api/guest-auctions')).status).toBe(401);
  expect((await api(page, '/api/guest-auctions/unknown/award', { bidId: 'unknown' })).status).toBe(401);
  await screenshot(page, info, 'signed-out');
});

test('dashboard is compact and requirement units persist canonically', async ({ browser }, info) => {
  const { context, page } = await signedPage(browser, 'a');
  try {
    await page.goto('/platform/dashboard');
    await expect(page.getByRole('link', { name: 'My Business', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Financials', exact: true })).toHaveCount(0);
    const jobs = page.locator('details').filter({ has: page.locator('summary', { hasText: 'My jobs' }) }).first();
    await expect(jobs).not.toHaveAttribute('open');
    await jobs.locator('summary').first().click();
    await expect(jobs).toHaveAttribute('open', '');
    await jobs.locator('summary').first().click();
    await expect(jobs).not.toHaveAttribute('open');
    await screenshot(page, info, 'compact-dashboard');
    await page.goto('/platform/spot-requirements/new');
    await expect(page.locator('select[name="quantityUnit"] option')).toHaveText(['Select a unit', 'Pallets', 'Parcels', 'Slots', 'Tonnes', 'Square metres (m²)', 'Cubic metres (m³)']);
    await page.getByLabel('Requirement title').fill(`SIMULATED ${readManifest().runId} slots`);
    await page.locator('[name="origin"]').fill('Brisbane QLD');
    await page.locator('[name="destination"]').fill('Gold Coast QLD');
    await page.locator('[name="quantity"]').fill('2');
    await page.locator('[name="quantityUnit"]').selectOption('slots');
    await page.locator('[name="requiredFrom"]').fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    const pending = page.waitForResponse(r => r.url().endsWith('/api/spot-requirements') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Post transport requirement', exact: true }).click();
    const response = await pending;
    expect(response.status()).toBe(201);
    const result = await response.json();
    const manifest = readManifest(); manifest.requirements.push(result.id); writeManifest(manifest);
    const saved = await one<{companyId: string; quantityUnit: string; quantity: string}>('SELECT "companyId","quantityUnit",quantity FROM "SpotRequirement" WHERE id=$1', [result.id]);
    expect(saved.companyId).toBe(companyId('a')); expect(saved.quantityUnit).toBe('slots'); expect(Number(saved.quantity)).toBe(2);
    const invalid = await api(page, '/api/spot-requirements', { requirementType: 'TRANSPORT', title: 'Invalid unit', origin: 'Brisbane', destination: 'Gold Coast', quantity: 1, quantityUnit: 'palets', requiredFrom: new Date(Date.now() + 86400000).toISOString() });
    expect(invalid.status).toBe(400);
  } finally { await context.close(); }
});

test('guest journey: create, sealed bids, award, deliver, confirm, review and reconcile', async ({ browser }, info) => {
  const guest = await signedPage(browser, 'guest');
  const a = await signedPage(browser, 'a');
  const b = await signedPage(browser, 'b');
  const outsider = await signedPage(browser, 'outsider');
  try {
    const id = await createGuestJob(guest.page);
    const manifest = readManifest();
    const initial = await one<AuctionRow>('SELECT * FROM "GuestAuction" WHERE id=$1', [id]);
    expect(initial.status).toBe('OPEN'); expect(initial.createdByUserId).toBe(manifest.users.guest);
    expect(Number((await one<{count: string}>('SELECT count(*) FROM "GuestAuctionBid" WHERE "guestAuctionId"=$1', [id])).count)).toBe(0);
    expect(Number((await one<{count: string}>('SELECT count(*) FROM "TransactionFee" WHERE "sourceId"=$1', [id])).count)).toBe(0);
    const bidA = await bid(a.page, id, 250, `PRIVATE-A-${manifest.runId}`);
    await bid(b.page, id, 300, `PRIVATE-B-${manifest.runId}`);
    await a.page.reload(); await b.page.reload();
    await expect(a.page.getByText(`PRIVATE-A-${manifest.runId}`, { exact: true })).toBeVisible();
    await expect(a.page.getByText(`PRIVATE-B-${manifest.runId}`, { exact: true })).toHaveCount(0);
    await expect(a.page.getByText('$300', { exact: true })).toHaveCount(0);
    await expect(b.page.getByText('$250', { exact: true })).toHaveCount(0);
    const sealedA = await api(a.page, `/api/guest-auctions/${id}/bids`);
    expect(sealedA.status).toBe(200); expect(sealedA.body.privacy).toBe('SEALED'); expect(sealedA.body.ownBid.id).toBe(bidA); expect(sealedA.body.ownBid.amount).toBe(250); expect(sealedA.body.bids).toBeUndefined();
    await screenshot(a.page, info, 'provider-a-sealed-bid');
    await outsider.page.goto(`/platform/guest-auctions/${id}`);
    expect((await api(outsider.page, `/api/guest-auctions/${id}/award`, { bidId: bidA, closeEarly: true })).status).toBe(403);
    expect((await api(guest.page, `/api/guest-auctions/${id}/review`, { rating: 5 })).status).toBe(409);
    await guest.page.reload();
    await expect(guest.page.getByText('$250', { exact: true })).toBeVisible();
    await expect(guest.page.getByText('$300', { exact: true })).toBeVisible();
    await expect(guest.page.getByText('Froto reputation', { exact: true })).toHaveCount(2);
    await screenshot(guest.page, info, 'guest-compares-bids');
    guest.page.on('dialog', dialog => dialog.accept());
    const awardResponse = guest.page.waitForResponse(r => r.url().endsWith(`/guest-auctions/${id}/award`) && r.request().method() === 'POST');
    await guest.page.getByRole('button', { name: `Award job to ${companyName('a')}` }).click();
    expect((await awardResponse).status()).toBe(200);
    expect((await api(guest.page, `/api/guest-auctions/${id}/award`, { bidId: bidA, closeEarly: true })).status).toBe(409);
    const fee = await one<FeeRow>('SELECT * FROM "TransactionFee" WHERE "idempotencyKey"=$1', [`GUEST_AUCTION:${id}`]);
    expect(fee.payerCompanyId).toBe(companyId('a')); expect(fee.status).toBe('CALCULATED');
    expect(Number(fee.feeExGst)).toBe(10); expect(Number(fee.gstAmount)).toBe(1); expect(Number(fee.feeIncGst)).toBe(11);
    const notices = (await db.query<{companyId: string; href: string}>(`SELECT "companyId",href FROM "Notification" WHERE type='GUEST_AUCTION_AWARDED' AND metadata->>'guestAuctionId'=$1`, [id])).rows;
    expect(notices).toHaveLength(1); expect(notices[0].companyId).toBe(companyId('a')); expect(notices[0].href).toBe(`/platform/guest-auctions/${id}`);
    expect((await api(guest.page, `/api/guest-auctions/${id}/status`, { action: 'ACCEPT' })).status).toBe(403);
    expect((await api(b.page, `/api/guest-auctions/${id}/status`, { action: 'ACCEPT' })).status).toBe(403);
    a.page.on('dialog', dialog => dialog.accept());
    for (const [button, status] of [['Accept guest job', 'ACCEPTED'], ['Start job', 'IN_PROGRESS'], ['Mark delivered', 'DELIVERED']] as const) {
      await a.page.reload();
      const pending = a.page.waitForResponse(r => r.url().endsWith(`/guest-auctions/${id}/status`) && r.request().method() === 'POST');
      await a.page.getByRole('button', { name: button, exact: true }).click();
      expect((await pending).status()).toBe(200);
      expect((await one<AuctionRow>('SELECT * FROM "GuestAuction" WHERE id=$1', [id])).status).toBe(status);
    }
    expect((await api(a.page, `/api/guest-auctions/${id}/status`, { action: 'COMPLETE' })).status).toBe(403);
    await guest.page.reload();
    const complete = guest.page.waitForResponse(r => r.url().endsWith(`/guest-auctions/${id}/status`) && r.request().method() === 'POST');
    await guest.page.getByRole('button', { name: 'Confirm job complete', exact: true }).click();
    expect((await complete).status()).toBe(200);
    expect((await api(guest.page, `/api/guest-auctions/${id}/status`, { action: 'COMPLETE' })).status).toBe(409);
    const earned = await one<FeeRow>('SELECT * FROM "TransactionFee" WHERE id=$1', [fee.id]);
    expect(earned.status).toBe('EARNED'); expect(earned.earnedAt).not.toBeNull(); expect(earned.invoicedAt).toBeNull(); expect(earned.paidAt).toBeNull();
    expect((await api(a.page, `/api/guest-auctions/${id}/review`, { rating: 5 })).status).toBe(403);
    await guest.page.getByRole('button', { name: '5 stars', exact: true }).click();
    await guest.page.getByPlaceholder('Optional comment about the service').fill('SIMULATED automated UAT review; no service performed.');
    const reviewResponse = guest.page.waitForResponse(r => r.url().endsWith(`/guest-auctions/${id}/review`) && r.request().method() === 'POST');
    await guest.page.getByRole('button', { name: 'Submit verified review', exact: true }).click();
    expect((await reviewResponse).status()).toBe(201);
    expect((await api(guest.page, `/api/guest-auctions/${id}/review`, { rating: 5 })).status).toBe(409);
    const review = await one<{reviewedCompanyId: string; reviewerUserId: string; rating: number}>('SELECT * FROM "GuestAuctionReview" WHERE "guestAuctionId"=$1', [id]);
    expect(review.reviewedCompanyId).toBe(companyId('a')); expect(review.reviewerUserId).toBe(manifest.users.guest); expect(review.rating).toBe(5);
    await screenshot(guest.page, info, 'completed-reviewed-guest-job');
  } finally { await Promise.all([guest.context.close(), a.context.close(), b.context.close(), outsider.context.close()]); }
});

test('two real guest award requests produce one winner and one matching fee', async ({ browser }, info) => {
  const guest = await signedPage(browser, 'guest');
  const a = await signedPage(browser, 'a');
  const b = await signedPage(browser, 'b');
  try {
    const id = await createGuestJob(guest.page);
    const bidA = await bid(a.page, id, 250, 'Simulated concurrent A');
    const bidB = await bid(b.page, id, 300, 'Simulated concurrent B');
    const results = await guest.page.evaluate(async ({ id, ids }) => Promise.all(ids.map(async bidId => {
      const response = await fetch(`/api/guest-auctions/${id}/award`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bidId, closeEarly: true }) });
      return { status: response.status, body: await response.json() };
    })), { id, ids: [bidA, bidB] });
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const auction = await one<AuctionRow>('SELECT * FROM "GuestAuction" WHERE id=$1', [id]);
    const fees = (await db.query<FeeRow>(`SELECT * FROM "TransactionFee" WHERE "transactionType"='GUEST_AUCTION' AND "sourceId"=$1`, [id])).rows;
    const bids = (await db.query<BidRow>('SELECT * FROM "GuestAuctionBid" WHERE "guestAuctionId"=$1', [id])).rows;
    const winner = bids.find(bid => bid.id === auction.awardedBidId)!;
    expect(bids.filter(bid => bid.status === 'AWARDED')).toHaveLength(1);
    expect(fees).toHaveLength(1); expect(fees[0].payerCompanyId).toBe(winner.bidderCompanyId); expect(fees[0].transactionAmount.toString()).toBe(winner.amount.toString());
    expect(Number((await one<{count: string}>(`SELECT count(*) FROM "Notification" WHERE type='GUEST_AUCTION_AWARDED' AND metadata->>'guestAuctionId'=$1`, [id])).count)).toBe(1);
    await info.attach('concurrent-http-results', { body: JSON.stringify({ id, statuses: results.map(r => r.status), winner: auction.awardedBidId, feeId: fees[0].id }), contentType: 'application/json' });
  } finally { await Promise.all([guest.context.close(), a.context.close(), b.context.close()]); }
});
