// Synthetic, dependency-free tests of a design-only prototype; no server, SDK or app.
import assert from 'node:assert/strict';
import test from 'node:test';
import { pickupWindowView, permissionFallback, mutationRecovery } from './au-permissions-recovery-prototype.v0.mjs';

const requested = (startUtc, endUtc, timeZone) => pickupWindowView({
  startUtc, endUtc, timeZone, state: 'REQUESTED', source: 'CUSTOMER_INPUT',
});

test('Brisbane shows AEST in November, not daylight time', () => {
  const view = requested('2026-11-16T00:00:00Z', '2026-11-16T02:00:00Z', 'Australia/Brisbane');
  assert.match(view.startLabel, /10:00 am/);
  assert.match(view.endLabel, /12:00 pm/);
  assert.match(view.startLabel, /AEST|GMT\+10/);
  assert.equal(view.label, 'REQUESTED_PICKUP_WINDOW_NOT_CONFIRMED');
});
test('Sydney November display differs from Brisbane because of DST', () => {
  const view = requested('2026-11-16T00:00:00Z', '2026-11-16T02:00:00Z', 'Australia/Sydney');
  assert.match(view.startLabel, /11:00 am/);
  assert.match(view.endLabel, /1:00 pm/);
  assert.match(view.startLabel, /AEDT|GMT\+11/);
});
test('Perth shows its own local pickup time', () => {
  const view = requested('2026-11-16T00:00:00Z', '2026-11-16T02:00:00Z', 'Australia/Perth');
  assert.match(view.startLabel, /8:00 am/);
});
test('DST jump displays distinct Sydney instants without constructing a nonexistent local 02:30', () => {
  const view = requested('2026-10-03T15:30:00Z', '2026-10-03T16:30:00Z', 'Australia/Sydney');
  assert.match(view.startLabel, /1:30 am/);
  assert.match(view.endLabel, /3:30 am/);
});
test('DST fallback prints two distinct 02:30 values with different zone offsets', () => {
  const view = requested('2027-04-03T15:30:00Z', '2027-04-03T16:30:00Z', 'Australia/Sydney');
  assert.match(view.startLabel, /2:30 am/);
  assert.match(view.endLabel, /2:30 am/);
  assert.notEqual(view.startLabel, view.endLabel);
});
test('a requested window cannot be labelled agreed from customer input', () => {
  assert.throws(() => pickupWindowView({startUtc:'2026-11-16T00:00:00Z',endUtc:'2026-11-16T01:00:00Z',timeZone:'Australia/Brisbane',state:'AGREED',source:'CUSTOMER_INPUT'}));
});
test('an agreed label requires a server-reconciled award source', () => {
  const view = pickupWindowView({startUtc:'2026-11-16T00:00:00Z',endUtc:'2026-11-16T01:00:00Z',timeZone:'Australia/Brisbane',state:'AGREED',source:'SERVER_RECONCILED_AWARD'});
  assert.equal(view.label, 'AGREED_PICKUP_WINDOW');
});
test('reject missing UTC designator rather than guessing local timezone', () => {
  assert.throws(() => requested('2026-11-16T10:00:00','2026-11-16T12:00:00Z','Australia/Brisbane'));
});
test('reject malformed instants, invalid ranges and unsupported zones', () => {
  assert.throws(() => requested('2026-02-30T00:00:00Z','2026-03-01T00:00:00Z','Australia/Sydney'));
  assert.throws(() => requested('2026-11-16T02:00:00Z','2026-11-16T01:00:00Z','Australia/Sydney'));
  assert.throws(() => requested('2026-11-16T00:00:00Z','2026-11-16T01:00:00Z','America/Los_Angeles'));
});
test('camera refusal leaves manual description/gallery route', () => {
  assert.equal(permissionFallback('camera','DENIED'),'MANUAL_ITEM_DESCRIPTION_OR_OPTIONAL_GALLERY');
});
test('location refusal leaves manual address input', () => {
  assert.equal(permissionFallback('location','DENIED'),'MANUAL_ADDRESS_ENTRY');
});
test('push refusal leaves in-app inbox and refresh', () => {
  assert.equal(permissionFallback('notification','DENIED'),'IN_APP_INBOX_AND_MANUAL_REFRESH');
});
test('unavailable permission and not-requested both avoid blocking posting', () => {
  assert.equal(permissionFallback('camera','UNAVAILABLE'),'MANUAL_ITEM_DESCRIPTION_OR_OPTIONAL_GALLERY');
  assert.equal(permissionFallback('location','NOT_REQUESTED'),'EXPLAIN_OPTIONAL_PERMISSION_AND_CONTINUE');
});
test('invalid permission choices fail visibly, not silently', () => {
  assert.throws(() => permissionFallback('contacts','DENIED'));
  assert.throws(() => permissionFallback('camera','STILL_LOADING'));
});
test('ambiguous network outcome never triggers automatic second award', () => {
  assert.equal(mutationRecovery('AWARD','NETWORK_TIMEOUT'),'FETCH_AUTHORISED_SERVER_STATE_THEN_ASK_BEFORE_RETRY');
});
test('ambiguous creation/offer/milestone actions use same reconciliation strategy', () => {
  for (const action of ['POST_GUEST_JOB','SUBMIT_PRIVATE_OFFER','RECORD_MILESTONE']) {
    assert.equal(mutationRecovery(action,'UNKNOWN_RESULT'),'FETCH_AUTHORISED_SERVER_STATE_THEN_ASK_BEFORE_RETRY');
  }
});
test('conflict re-fetches authoritative state', () => {
  assert.equal(mutationRecovery('AWARD','HTTP_409'),'REFRESH_SERVER_STATE_AND_EXPLAIN_CONFLICT');
});
test('expired session reauthenticates without exposing records', () => {
  assert.equal(mutationRecovery('SUBMIT_PRIVATE_OFFER','HTTP_401'),'REAUTHENTICATE_THEN_RECHECK_ACCESS');
});
test('only confirmed server response is displayed as success', () => {
  assert.equal(mutationRecovery('POST_GUEST_JOB','SERVER_CONFIRMED'),'RENDER_AUTHORITATIVE_SERVER_RESULT');
});
test('unknown mutation operation or outcome is rejected', () => {
  assert.throws(() => mutationRecovery('CAPTURE_PAYMENT','NETWORK_TIMEOUT'));
  assert.throws(() => mutationRecovery('AWARD','NETWORK_MAYBE'));
});
