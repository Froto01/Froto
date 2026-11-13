// Design-only, dependency-free static contract tests. NO network, DB, credentials or app launch.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const dir = dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(readFileSync(join(dir, 'guest-auction-mobile-contract.v0.json'), 'utf8'));
const inventory = readFileSync(join(dir, 'foundation-api-gap-inventory-2026-11-14.md'), 'utf8');

const route = (operation) => contract.existingRoutes.find((entry) => entry.operation === operation);
const transition = (action) => contract.guestJourney.find((entry) => entry.action === action);

test('contract is explicitly proposed and tied to a full verified baseline SHA', () => {
  assert.equal(contract.status, 'PROPOSED_DESIGN_ONLY_NOT_IMPLEMENTED');
  assert.match(contract.baselineSha, /^[a-f0-9]{40}$/);
  assert.equal(contract.frameworkSelected, false);
  assert.equal(contract.nativeAppBuilt, false);
});

test('Australia-first presentation and DST-awareness are explicit', () => {
  assert.equal(contract.launchTerritory, 'AU');
  assert.equal(contract.currency, 'AUD');
  assert.match(contract.timePolicy, /IANA.*DST-aware/);
});

test('existing guest auction routes are identified and listed in the source inventory', () => {
  for (const item of contract.existingRoutes) {
    assert.match(item.route, /^(GET|POST|PATCH|DELETE) \/api\//);
    assert.ok(inventory.includes(item.route), 'Missing inventory reference: ' + item.route);
  }
});

test('only individual guest customer can create; only company provider can bid', () => {
  assert.equal(route('create').actor, 'GUEST_CUSTOMER');
  assert.match(route('create').serverGuard, /without company membership/);
  assert.equal(route('placeSealedBid').actor, 'COMPANY_PROVIDER');
});

test('private offers cannot be exposed to rival companies', () => {
  assert.equal(contract.sealedOffers.ownerCanCompareAll, true);
  assert.equal(contract.sealedOffers.providerCanSeeOwnOnly, true);
  assert.equal(contract.sealedOffers.providerCanSeeRivals, false);
});

test('guest lifecycle preserves provider delivery and customer completion authority', () => {
  assert.deepEqual(contract.guestJourney.map(x => x.action), ['CREATE','BID','AWARD','ACCEPT','START','DELIVER','COMPLETE']);
  assert.deepEqual([transition('AWARD').from, transition('AWARD').to, transition('AWARD').actor], ['OPEN','AWARDED','GUEST_CUSTOMER']);
  assert.equal(transition('DELIVER').actor, 'COMPANY_PROVIDER');
  assert.deepEqual([transition('COMPLETE').from, transition('COMPLETE').actor], ['DELIVERED','GUEST_CUSTOMER']);
});

test('ambiguous offline outcomes require reconciliation; no assumed retry success', () => {
  assert.ok(contract.futureGaps.some(x => x.includes('idempotency')));
  assert.ok(contract.futureClientFailureStates.includes('UNKNOWN_RECONCILE_REQUIRED'));
  assert.ok(contract.futureClientFailureStates.includes('CONFLICT_REFRESH_409'));
});

test('payment remains design-only, with no provider, card storage or escrow promise', () => {
  assert.equal(contract.payment.liveIntegrationEnabled, false);
  assert.equal(contract.payment.providerSelected, false);
  assert.equal(contract.payment.cardDataStoredInFroto, false);
  assert.equal(contract.payment.escrowGuaranteed, false);
  assert.ok(contract.payment.proposedStatesNotInDatabase.includes('FUNDING_FAILED'));
  assert.ok(contract.payment.proposedStatesNotInDatabase.includes('DISPUTED'));
});

test('inventory captures permissions, photo and access needs, notifications and framework non-decision', () => {
  for(const term of ['camera', 'dimensions', 'lift/stairs', 'push', 'multi-company', 'Clerk', 'idempotency', 'React Native', 'Flutter', 'not selected', 'original Froto logo']) {
    assert.ok(inventory.toLowerCase().includes(term.toLowerCase()), 'Inventory missing ' + term);
  }
});

test('source inventory states zero production or native validation is provided', () => {
  assert.match(inventory, /cannot validate actual backend permissions/);
  assert.match(inventory, /No existing native app is claimed/);
  assert.match(inventory, /Owner action today: NONE/);
});
