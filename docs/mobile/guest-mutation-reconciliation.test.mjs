import test from 'node:test';
import assert from 'node:assert/strict';
import { planGuestMutationRecovery } from './guest-mutation-reconciliation.v0.mjs';

const plan = (kind = 'AWARD_OFFER', result = 'NETWORK_TIMEOUT', identity = 'SAME_VIEWER_HINT', lookup = 'NOT_FETCHED') =>
  planGuestMutationRecovery({ kind, result, identity, lookup });

for (const kind of ['CREATE_JOB', 'SUBMIT_PRIVATE_OFFER', 'AWARD_OFFER', 'RECORD_MILESTONE']) {
  test(`${kind}: timeout never triggers automatic replay`, () => {
    const r = plan(kind);
    assert.equal(r.automaticRetryAllowed, false);
    assert.equal(r.operationConfirmedByThisPrototype, false);
  });
}
test('unknown create cannot be certified by a matching-looking list record', () => {
  const r = plan('CREATE_JOB', 'NETWORK_TIMEOUT', 'SAME_VIEWER_HINT', 'AUTHORIZED_RECORD_VISIBLE');
  assert.equal(r.screen, 'CREATE_OUTCOME_UNKNOWN');
  assert.match(r.nextSafeAction, /BEFORE_REPOST/);
});
test('unknown bid with visible record never certifies its own write', () => {
  const r = plan('SUBMIT_PRIVATE_OFFER', 'NETWORK_LOST', 'SAME_VIEWER_HINT', 'AUTHORIZED_RECORD_VISIBLE');
  assert.equal(r.screen, 'SERVER_RECORD_VISIBLE_WRITE_UNATTRIBUTED');
  assert.equal(r.operationConfirmedByThisPrototype, false);
});
test('timeout with no fresh lookup requests authorized fetch', () => {
  assert.equal(plan().screen, 'WRITE_OUTCOME_UNKNOWN');
});
test('unseen record is not a green light to retry', () => {
  const r = plan('AWARD_OFFER', 'HTTP_5XX', 'SAME_VIEWER_HINT', 'RECORD_NOT_VISIBLE');
  assert.equal(r.screen, 'SERVER_RECORD_NOT_VISIBLE');
  assert.equal(r.automaticRetryAllowed, false);
});
test('401 requires session restoration and re-fetch', () => {
  const r = plan('RECORD_MILESTONE', 'HTTP_401');
  assert.equal(r.screen, 'SESSION_RECHECK');
});
test('signed-out identity fails closed even with 2xx', () => {
  assert.equal(plan('AWARD_OFFER', 'HTTP_2XX', 'SIGNED_OUT').screen, 'SESSION_RECHECK');
});
test('switched company/user clears private view instead of trusting old result', () => {
  const r = plan('SUBMIT_PRIVATE_OFFER', 'HTTP_2XX', 'CHANGED_VIEWER', 'AUTHORIZED_RECORD_VISIBLE');
  assert.equal(r.screen, 'DISCARD_PRIVATE_VIEW');
  assert.equal(r.cachedPrivateDataAllowed, false);
});
test('unknown viewer clears private view', () => {
  assert.equal(plan('CREATE_JOB', 'NETWORK_TIMEOUT', 'UNKNOWN').screen, 'DISCARD_PRIVATE_VIEW');
});
test('403/404/access denied never show stale record', () => {
  for (const [status, lookup] of [['HTTP_403', 'NOT_FETCHED'], ['HTTP_404', 'NOT_FETCHED'], ['NETWORK_TIMEOUT', 'ACCESS_DENIED']]) {
    const r = plan('SUBMIT_PRIVATE_OFFER', status, 'SAME_VIEWER_HINT', lookup);
    assert.equal(r.screen, 'RECORD_UNAVAILABLE');
    assert.equal(r.cachedPrivateDataAllowed, false);
  }
});
test('409 and conflicting fresh state require reconciliation', () => {
  assert.equal(plan('AWARD_OFFER', 'HTTP_409').screen, 'STATE_CHANGED');
  assert.equal(plan('AWARD_OFFER', 'NETWORK_TIMEOUT', 'SAME_VIEWER_HINT', 'STATE_CONFLICT').screen, 'STATE_CHANGED');
});
test('successful HTTP response still needs authoritative state fetch', () => {
  const r = plan('AWARD_OFFER', 'HTTP_2XX');
  assert.equal(r.screen, 'RECONCILE_AUTHORITATIVE_RESULT');
  assert.equal(r.paymentCaptured, false);
});
test('all returned projections are immutable and never claim money or server mutation', () => {
  for (const kind of ['CREATE_JOB', 'SUBMIT_PRIVATE_OFFER', 'AWARD_OFFER', 'RECORD_MILESTONE']) {
    for (const status of ['NETWORK_TIMEOUT', 'NETWORK_LOST', 'HTTP_2XX', 'HTTP_401', 'HTTP_403', 'HTTP_404', 'HTTP_409', 'HTTP_5XX']) {
      const r = plan(kind, status);
      assert.ok(Object.isFrozen(r));
      assert.equal(r.serverMutationPerformed, false);
      assert.equal(r.paymentCaptured, false);
      assert.equal(r.payoutReleased, false);
    }
  }
});
test('unknown operation, HTTP outcome, identity or lookup is rejected', () => {
  for (const bad of [
    { kind: 'CHARGE' }, { result: 'HTTP_402' }, { identity: 'ADMIN' }, { lookup: 'CONFIRMED_IDEMPOTENT_RECEIPT' },
  ]) {
    assert.throws(() => planGuestMutationRecovery({
      kind:'AWARD_OFFER', result:'NETWORK_TIMEOUT', identity:'SAME_VIEWER_HINT', lookup:'NOT_FETCHED', ...bad,
    }), RangeError);
  }
});
