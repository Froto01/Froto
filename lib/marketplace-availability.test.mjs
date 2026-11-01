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
  isOfferWindowOpen, listingBiddingState, tenderResponseState, sortOpenFirst,
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
