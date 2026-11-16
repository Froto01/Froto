import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = readFileSync('app/layout.tsx', 'utf8');
const header = readFileSync('components/public-brand-header.tsx', 'utf8');
const marketplace = readFileSync('app/platform/page.tsx', 'utf8');

test('root provides one shared branded header', () => {
  assert.equal((root.match(/<PublicBrandHeader\s*\/>/g) ?? []).length, 1);
  assert.equal((header.match(/<header\b/g) ?? []).length, 1);
  assert.equal((header.match(/src="\/brand\/froto-logo\.svg"/g) ?? []).length, 1);
  assert.match(header, /href="\/platform"/);
  assert.match(header, /href="\/platform\/dashboard"/);
});

test('marketplace relies on shared header and retains accessible tools', () => {
  assert.doesNotMatch(marketplace, /<header\b|froto-logo\.svg/);
  assert.match(marketplace, /htmlFor="opportunity-search"/);
  assert.match(marketplace, /id="opportunity-search"/);
  assert.match(marketplace, /aria-pressed=\{activeTab === "marketplace"\}/);
  assert.match(marketplace, /aria-pressed=\{activeTab === "tenders"\}/);
  assert.match(marketplace, /href="\/platform\/onboarding"/);
});
