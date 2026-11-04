import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/platform/page.tsx', 'utf8');

test('capacity and buyer requirement cards use compact responsive rows', () => {
  assert.match(page, /aria-label="Open transport and storage requirements"/);
  assert.match(page, /aria-label="Available transport and storage capacity"/);
  assert.match(page, /className="mb-7 space-y-3"/);
  assert.match(page, /className="space-y-3" aria-label="Available transport and storage capacity"/);
  assert.match(page, /sm:flex-row sm:items-center/);
  assert.doesNotMatch(page, /h-48 w-full object-cover/);
});

test('capacity rows retain state, dates, size, owner and link to the actual listing', () => {
  assert.match(page, /listingBiddingState\(listing, nowMs\) === "CLOSED"/);
  assert.match(page, /listing\.capacityAmount/);
  assert.match(page, /listing\.capacityUnit/);
  assert.match(page, /listing\.biddingClosesAt/);
  assert.match(page, /listing\.isOwner/);
  assert.match(page, /listing\.bidCount/);
  assert.match(page, /href=\{`\/platform\/listing\/\$\{listing\.id\}`\}/);
});

test('buying rows preserve sealed-offer privacy, deadline and role-safe action', () => {
  assert.match(page, /LockKeyhole aria-label="Private offers"/);
  assert.match(page, /requirement\.offersCloseAt/);
  assert.match(page, /requirement\.quantityUnit/);
  assert.match(page, /requirement\.ownOffer \? "View your offer" : "Submit private offer"/);
  assert.match(page, /href=\{`\/platform\/spot-requirements\/\$\{requirement\.id\}`\}/);
  assert.doesNotMatch(page, /requirement\.otherOffers/);
});

test('marketplace language accurately describes Froto as a supply chain spot market', () => {
  assert.match(page, /Live supply chain spot market/);
  assert.doesNotMatch(page, /Live logistics marketplace/);
  assert.match(page, /Search opportunities/);
});
