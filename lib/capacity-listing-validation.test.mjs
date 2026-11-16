import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./capacity-listing-validation.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiled = { exports: {} };
new Function('module', 'exports', transpiled)(compiled, compiled.exports);
const { validateCapacityListing } = compiled.exports;

const now = Date.parse('2026-11-03T00:00:00Z');
const valid = {
  listingType: 'Transport Lane',
  title: 'Brisbane to Gold Coast lane',
  location: '',
  origin: 'Brisbane QLD',
  destination: 'Gold Coast QLD',
  capacityAmount: '22',
  availableFrom: '2026-11-05',
  availableTo: '2026-11-07',
  startingBid: '100',
  minimumBidIncrement: '5',
  biddingClosesAt: '2026-11-04T10:00',
};

test('valid transport listing passes review', () => {
  assert.equal(validateCapacityListing(valid, now), null);
});

test('warehouse location is required, transport route is irrelevant to warehouse', () => {
  assert.match(validateCapacityListing({ ...valid, listingType: 'Warehouse Space' }, now), /location/);
  assert.equal(validateCapacityListing({ ...valid, listingType: 'Warehouse Space', location: 'Brisbane', origin: '', destination: '' }, now), null);
});

test('transport requires both route endpoints', () => {
  assert.match(validateCapacityListing({ ...valid, destination: '' }, now), /origin and destination/);
});

test('fractional, zero and blank capacity fail before publication', () => {
  for (const capacityAmount of ['0', '2.5', '', '-1', 'Infinity']) {
    assert.match(validateCapacityListing({ ...valid, capacityAmount }, now), /positive whole number/);
  }
});

test('dates must be real, ordered calendar days', () => {
  assert.match(validateCapacityListing({ ...valid, availableFrom: '2026-02-30' }, now), /valid availability dates/);
  assert.match(validateCapacityListing({ ...valid, availableTo: '2026-11-01' }, now), /earlier/);
});

test('bid amount and increments follow existing server constraints', () => {
  assert.match(validateCapacityListing({ ...valid, startingBid: '-2' }, now), /zero or greater/);
  assert.match(validateCapacityListing({ ...valid, minimumBidIncrement: '0' }, now), /greater than zero/);
});

test('a closing time equal to or earlier than now cannot be reviewed', () => {
  assert.match(validateCapacityListing({ ...valid, biddingClosesAt: '2026-11-03T00:00' }, now), /future/);
  assert.match(validateCapacityListing({ ...valid, biddingClosesAt: 'bad' }, now), /future/);
});

test('listing page requires review before calling server create action', () => {
  const page = readFileSync(new URL('../app/platform/listings/new/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /validateCapacityListing\(form, Date\.now\(\)\)/);
  assert.match(page, /if \(!reviewedForm \|\| JSON\.stringify\(reviewedForm\) !== JSON\.stringify\(form\)\)/);
  assert.ok(page.indexOf('setReviewedForm({ ...form })') < page.indexOf('await createListing({'));
  assert.match(page, /setReviewedForm\(null\);/);
  assert.match(page, /Review before publishing/);
  assert.match(page, /Publishing\.\.\./);
});
