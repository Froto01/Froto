import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./marketplace-availability.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiled = { exports: {} };
new Function('module', 'exports', transpiled)(compiled, compiled.exports);
const {
  isOfferWindowOpen, listingBiddingState, listingMarketplaceAction, tenderResponseState, sortOpenFirst, guestAuctionDisplayState, marketplaceResultsLabel, marketplaceViewFromHash,
} = compiled.exports;

const now = Date.parse('2026-11-02T00:00:00.000Z');
const future = '2026-11-02T01:00:00.000Z';
const expired = '2026-11-01T23:59:59.000Z';

test('offer deadlines are exclusive and invalid dates fail closed', () => {
  assert.equal(isOfferWindowOpen(null, now), true);
  assert.equal(isOfferWindowOpen(future, now), true);
  assert.equal(isOfferWindowOpen(new Date(now).toISOString(), now), false);
  assert.equal(isOfferWindowOpen(expired, now), false);
  assert.equal(isOfferWindowOpen('invalid-date', now), false);
});

test('stale OPEN listing is not presented as biddable after deadline', () => {
  assert.equal(listingBiddingState({ auctionState: 'OPEN', biddingClosesAt: future }, now), 'OPEN');
  assert.equal(listingBiddingState({ auctionState: 'OPEN', biddingClosesAt: expired }, now), 'CLOSED');
  assert.equal(listingBiddingState({ auctionState: 'CLOSED', biddingClosesAt: future }, now), 'CLOSED');
  assert.equal(listingBiddingState({ auctionState: 'OPEN', biddingClosesAt: null }, now), 'OPEN');
});

test('marketplace listing actions distinguish owners, live bids and expired offers', () => {
  const listing = (isOwner, auctionState, biddingClosesAt) => ({ isOwner, auctionState, biddingClosesAt });
  assert.equal(listingMarketplaceAction(listing(true, 'OPEN', future), now), 'Manage');
  assert.equal(listingMarketplaceAction(listing(true, 'CLOSED', expired), now), 'Manage');
  assert.equal(listingMarketplaceAction(listing(false, 'OPEN', future), now), 'Bid');
  assert.equal(listingMarketplaceAction(listing(false, 'OPEN', expired), now), 'View');
  assert.equal(listingMarketplaceAction(listing(false, 'CLOSED', future), now), 'View');
  assert.equal(listingMarketplaceAction(listing(false, 'OPEN', 'invalid-date'), now), 'View');
});

test('marketplace listing links expose contextual action names to screen readers', () => {
  const page = readFileSync(new URL('../app/platform/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /aria-label=\{\x60\$\{listingMarketplaceAction\(listing, nowMs\)\} listing: \$\{listing.title\}\x60\}/);
  assert.match(page, /\{listingMarketplaceAction\(listing, nowMs\)\}/);
});

test('awarded tender stays awarded after response expiry', () => {
  assert.equal(tenderResponseState({ status: 'AWARDED', responseClosed: true, responseClosesAt: expired }, now), 'AWARDED');
  assert.equal(tenderResponseState({ status: 'OPEN', responseClosed: false, responseClosesAt: expired }, now), 'CLOSED');
  assert.equal(tenderResponseState({ status: 'OPEN', responseClosed: true, responseClosesAt: future }, now), 'CLOSED');
  assert.equal(tenderResponseState({ status: 'OPEN', responseClosed: false, responseClosesAt: future }, now), 'OPEN');
});

test('open-first ordering is deterministic, newest-first within state, and non-mutating', () => {
  const original = [
    { id: 'closed-new', open: false, createdAt: '2026-11-02T00:00:00Z' },
    { id: 'open-old', open: true, createdAt: '2026-11-01T00:00:00Z' },
    { id: 'closed-old', open: false, createdAt: '2026-10-31T00:00:00Z' },
    { id: 'open-new', open: true, createdAt: '2026-11-01T12:00:00Z' },
  ];
  const snapshot = original.map(item => item.id);
  const actual = sortOpenFirst(original, item => item.open).map(item => item.id);
  assert.deepEqual(actual, ['open-new', 'open-old', 'closed-new', 'closed-old']);
  assert.deepEqual(original.map(item => item.id), snapshot);
});

test('marketplace page uses current-time availability for filters and visible actions', () => {
  const page = readFileSync(new URL('../app/platform/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /listingBiddingState\(listing, nowMs\)/);
  assert.match(page, /tenderResponseState\(tender, nowMs\)/);
  assert.match(page, /sortOpenFirst\(/);
  assert.match(page, /isOfferWindowOpen\(auction\.auctionClosesAt, nowMs\)/);
  assert.match(page, /isOfferWindowOpen\(requirement\.offersCloseAt, nowMs\)/);
});
test('guest auctions close their offer window at the deadline without erasing later job states', () => {
  const open = (status, auctionClosesAt) => guestAuctionDisplayState({ status, auctionClosesAt }, now);
  assert.equal(open('OPEN', future), 'OPEN');
  assert.equal(open('OPEN', expired), 'OFFERS CLOSED');
  assert.equal(open('OPEN', new Date(now).toISOString()), 'OFFERS CLOSED');
  assert.equal(open('OPEN', 'not-a-date'), 'OFFERS CLOSED');
  assert.equal(open('AWARDED', expired), 'AWARDED');
  assert.equal(open('IN_PROGRESS', expired), 'IN_PROGRESS');
  assert.equal(open('DELIVERED', expired), 'DELIVERED');
  assert.equal(open('COMPLETED', expired), 'COMPLETED');
  assert.equal(open('CANCELLED', future), 'CANCELLED');
  assert.equal(open(undefined, future), 'UNKNOWN');
});

test('guest marketplace preview and guest dashboard use expiry-aware labels and open counts', () => {
  const preview = readFileSync(new URL('../app/platform/layout.tsx', import.meta.url), 'utf8');
  const guestDashboard = readFileSync(new URL('../app/platform/guest-dashboard/page.tsx', import.meta.url), 'utf8');
  assert.match(preview, /guestAuctionDisplayState\(/);
  assert.match(guestDashboard, /guestAuctionDisplayState\(/);
  assert.match(guestDashboard, /const openCount = auctions\.filter\(/);
  assert.match(guestDashboard, /Offers closed/);
});

test('marketplace count summaries distinguish loading, failures and loaded records', () => {
  assert.equal(marketplaceResultsLabel(true, null, 0, 0, 'capacity listings'), 'Loading capacity listings…');
  assert.equal(marketplaceResultsLabel(false, 'API unavailable', 0, 0, 'capacity listings'), 'Capacity listing count unavailable');
  assert.equal(marketplaceResultsLabel(false, 'API unavailable', 0, 0, 'tenders'), 'Tender count unavailable');
  assert.equal(marketplaceResultsLabel(false, null, 0, 0, 'capacity listings'), 'Showing 0 of 0 loaded capacity listings');
  assert.equal(marketplaceResultsLabel(false, null, 1, 3, 'tenders'), 'Showing 1 of 3 loaded tenders');
});

test('marketplace and tender filters announce only loaded-result totals, not unverified global totals', () => {
  const page = readFileSync(new URL('../app/platform/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /marketplaceResultsLabel\(listingsLoading, listingsError, filteredListings\.length, marketplaceListings\.length, "capacity listings"\)/);
  assert.match(page, /marketplaceResultsLabel\(tendersLoading, tendersError, filteredTenders\.length, marketplaceTenders\.length, "tenders"\)/);
  assert.equal((page.match(/aria-live="polite" aria-atomic="true"/g) ?? []).length, 2);
});

test('hash navigation restores marketplace and tenders views with keyboard-visible focus', () => {
  assert.equal(marketplaceViewFromHash('#tenders'), 'tenders');
  assert.equal(marketplaceViewFromHash('#marketplace'), 'marketplace');
  assert.equal(marketplaceViewFromHash('#not-a-tab'), 'marketplace');
  assert.equal(marketplaceViewFromHash(''), 'marketplace');

  const page = readFileSync(new URL('../app/platform/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('setActiveTab(marketplaceViewFromHash(window.location.hash))'));
  assert.ok(page.includes('addEventListener("hashchange", syncTabWithHash)'));
  assert.ok(page.includes('removeEventListener("hashchange", syncTabWithHash)'));
  assert.equal((page.match(/focus-visible:outline-offset-2/g) ?? []).length, 2);
});
