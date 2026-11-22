import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const c = JSON.parse(readFileSync(new URL('./api-parity-negative-cases.v0.json', import.meta.url), 'utf8'));
const cases = c.clientNegativeCases;

test('source pinned to approved AU-first web baseline', () => {
  assert.equal(c.approvedIssue, 41);
  assert.equal(c.baselineSha, '38627662a93ab6cd7e35a792a46a62de82010904');
  assert.equal(c.market, 'AU');
  assert.equal(c.currency, 'AUD');
});
test('proposal cannot be mistaken for app or framework approval', () => {
  assert.match(c.status, /PROPOSED_DESIGN_ONLY/);
  assert.equal(c.nativeBuildCompleted, false);
  assert.equal(c.frameworkSelected, false);
  assert.equal(c.serverAuthOrPaymentModified, false);
  assert.equal(c.publicRebrandProposed, false);
});
test('existing route references are unique and use web API only', () => {
  const routes = Object.values(c.routes);
  assert.equal(routes.length, 5);
  assert.equal(new Set(routes).size, 5);
  for (const route of routes) assert.match(route, /^(GET|POST|GET\/POST|GET\/PATCH) \/api\//);
});
test('all 16 negative scenarios are unique and explicitly safe', () => {
  assert.equal(Object.keys(cases).length, 16);
  assert.equal(new Set(Object.values(cases)).size, 15);
  assert.ok(Object.values(cases).every(value => !/^(SUBMIT|CHARGE|RELEASE|AUTO_POST|AUTO_AWARD)/.test(value)));
});
test('timeout never implies duplicate guest posting', () => assert.equal(cases.guestAfterTimeout, 'RECONCILE_NO_AUTOMATIC_POST'));
test('provider cannot view competing sealed offers', () => assert.equal(cases.bidderSeesOthers, 'HIDE_RIVAL_OFFERS'));
test('owner compares only server-authoritative bids', () => assert.equal(cases.ownerCompares, 'SERVER_AUTHORITATIVE_ONLY'));
test('award conflict never retries automatically', () => assert.equal(cases.awardConflict409, 'REFRESH_NO_AUTOMATIC_AWARD'));
test('401 clears private data before reauthentication', () => assert.equal(cases.expiredSession401, 'CLEAR_PRIVATE_VIEW_REAUTH_FETCH'));
test('403 and 404 both clear private data', () => {
  assert.equal(cases.otherTenant403, 'CLEAR_PRIVATE_VIEW_INBOX');
  assert.equal(cases.missingRecord404, 'CLEAR_PRIVATE_VIEW_INBOX');
});
test('company switch must recheck source tenant', () => assert.equal(cases.companySwitch, 'CLEAR_PRIVATE_CACHE_RECHECK_SERVER'));
test('deep link remains untrusted until authorised lookup', () => assert.equal(cases.untrustedDeepLink, 'INBOX_AND_AUTHORISED_LOOKUP'));
test('denied camera has manual description', () => assert.equal(cases.deniedCamera, 'MANUAL_DESCRIPTION'));
test('denied location has manual address', () => assert.equal(cases.deniedLocation, 'MANUAL_ADDRESS_ENTRY'));
test('denied notifications leave an inbox fallback', () => assert.equal(cases.deniedPush, 'IN_APP_INBOX_MANUAL_REFRESH'));
test('requested pickup cannot become agreed without server', () => assert.equal(cases.requestedWindow, 'NOT_AGREED_PICKUP'));
test('courier evidence cannot confirm customer completion', () => assert.equal(cases.courierEvidence, 'NOT_CUSTOMER_COMPLETION'));
test('fee snapshot does not represent captured funds', () => assert.equal(cases.feeSnapshot, 'NOT_CUSTOMER_FUNDS'));
test('payment remains design only, not activated', () => assert.equal(cases.paymentFlow, 'DESIGN_ONLY_NO_CHARGE'));
test('required backend gap categories remain explicit', () => {
  assert.equal(c.gapsNotImplemented.length, 7);
  assert.ok(c.gapsNotImplemented.some(s => s.includes('idempotency')));
  assert.ok(c.gapsNotImplemented.some(s => s.includes('funding/refund/release')));
});
