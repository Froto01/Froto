import assert from 'node:assert/strict';
import test from 'node:test';
import { guestHandoverIntent as view } from './guest-handover-intent.v0.mjs';

const base = { viewer: 'WINNING_COMPANY', jobStatus: 'IN_PROGRESS', method: 'IN_PERSON_PIN', proof: 'NONE' };
const at = (change = {}) => view({ ...base, ...change });
const noFinancialClaim = (v) => {
  assert.equal(v.payoutPermitted, false);
  assert.equal(v.serverMutationPerformed, false);
  assert.equal('pin' in v, false);
  assert.equal('photo' in v, false);
};

test('courier in-person capture requests server PIN verification, never contains PIN', () => {
  const v = at(); assert.equal(v.screen, 'CAPTURE_EVIDENCE');
  assert.equal(v.intent, 'REQUEST_SERVER_PIN_VERIFICATION_WITHOUT_LOGGING_CODE'); noFinancialClaim(v);
});
test('safe-drop photo is separate from in-person PIN, with no upload performed', () => {
  const v = at({ method: 'AGREED_SAFE_DROP_PHOTO' });
  assert.equal(v.intent, 'REQUEST_AUTHORIZED_SAFE_DROP_PHOTO_UPLOAD'); noFinancialClaim(v);
});
test('local unsent evidence remains a draft, not a recorded handover', () => {
  const v = at({ proof: 'LOCAL_UNSENT' }); assert.equal(v.screen, 'UNSENT_EVIDENCE'); noFinancialClaim(v);
});
test('ambiguous upload receipt forces server reconciliation without auto retry', () => {
  const v = at({ proof: 'AWAITING_SERVER_RECEIPT' });
  assert.equal(v.intent, 'FETCH_SERVER_PROOF_STATE_NO_AUTOMATIC_UPLOAD'); noFinancialClaim(v);
});
test('accepted proof proposes delivery milestone, not completion or payment release', () => {
  const v = at({ proof: 'SERVER_ACCEPTED' });
  assert.equal(v.intent, 'REQUEST_DELIVERY_MILESTONE_AFTER_SERVER_CHECK'); noFinancialClaim(v);
});
test('customer with accepted evidence can review, not auto-confirm', () => {
  const v = at({ viewer: 'GUEST_OWNER', jobStatus: 'DELIVERED', proof: 'SERVER_ACCEPTED' });
  assert.equal(v.intent, 'REVIEW_PROOF_AND_CONFIRM_OR_REPORT_ISSUE'); noFinancialClaim(v);
});
test('customer with missing proof is directed to review rather than automatic completion', () => {
  const v = at({ viewer: 'GUEST_OWNER', jobStatus: 'DELIVERED' });
  assert.equal(v.intent, 'REPORT_MISSING_PROOF_OR_REQUEST_REVIEW'); noFinancialClaim(v);
});
test('courier cannot self-confirm delivered job, waits for customer', () => {
  const v = at({ jobStatus: 'DELIVERED', proof: 'SERVER_ACCEPTED' });
  assert.equal(v.screen, 'AWAIT_CUSTOMER_COMPLETION'); noFinancialClaim(v);
});
test('completed is read-only for authorized customer and courier', () => {
  for (const viewer of ['GUEST_OWNER', 'WINNING_COMPANY']) {
    const v = at({ viewer, jobStatus: 'COMPLETED', proof: 'SERVER_ACCEPTED' });
    assert.equal(v.intent, 'VIEW_CONFIRMED_MILESTONE'); noFinancialClaim(v);
  }
});
test('customer cannot see courier evidence capture before delivery', () => {
  const v = at({ viewer: 'GUEST_OWNER', jobStatus: 'IN_PROGRESS' });
  assert.equal(v.screen, 'CUSTOMER_PROGRESS'); noFinancialClaim(v);
});
test('courier before in-progress follows server status and cannot capture prematurely', () => {
  for (const jobStatus of ['OPEN', 'AWARDED', 'ACCEPTED']) {
    const v = at({ jobStatus }); assert.equal(v.screen, 'COURIER_PROGRESS'); noFinancialClaim(v);
  }
});
test('every explicit handover exception has a report-and-review path', () => {
  for (const exception of ['MISSING_PIN', 'RECIPIENT_UNAVAILABLE', 'FAILED_UPLOAD', 'FAILED_PICKUP', 'DAMAGE']) {
    const v = at({ exception }); assert.equal(v.intent, 'REPORT_ISSUE_AND_REQUEST_SERVER_REVIEW'); noFinancialClaim(v);
  }
});
test('exception requires review even if evidence was server accepted', () => {
  const v = at({ exception: 'DAMAGE', proof: 'SERVER_ACCEPTED', jobStatus: 'DELIVERED' });
  assert.equal(v.screen, 'EXCEPTION_REVIEW'); noFinancialClaim(v);
});
test('unrelated viewer does not receive job or evidence specifics', () => {
  const v = at({ viewer: 'OTHER', jobStatus: 'DELIVERED', proof: 'SERVER_ACCEPTED' });
  assert.deepEqual(v, { screen: 'ACCESS_UNAVAILABLE', intent: 'RETURN_TO_AUTHORIZED_LIST', serverMutationPerformed: false, payoutPermitted: false });
});
test('401 sends back to sign-in and re-fetch, without trusting cached role', () => {
  const v = at({ response: 'HTTP_401' });
  assert.equal(v.intent, 'SIGN_IN_THEN_FETCH_AUTHORIZED_RECORD'); noFinancialClaim(v);
});
test('403 hides content regardless of caller-supplied role', () => {
  const v = at({ viewer: 'GUEST_OWNER', jobStatus: 'DELIVERED', response: 'HTTP_403' });
  assert.equal(v.screen, 'ACCESS_UNAVAILABLE'); noFinancialClaim(v);
});
test('409 requires re-fetch before acting', () => {
  const v = at({ response: 'HTTP_409' });
  assert.equal(v.intent, 'FETCH_AUTHORIZED_RECORD_BEFORE_ANY_ACTION'); noFinancialClaim(v);
});
test('unknown network response never retries or assumes server success', () => {
  const v = at({ response: 'UNKNOWN_RESULT' });
  assert.equal(v.intent, 'FETCH_AUTHORIZED_RECORD_NO_AUTOMATIC_RETRY'); noFinancialClaim(v);
});
test('unknown status, method, proof, exception, viewer or response fails visibly', () => {
  for (const change of [
    { jobStatus: 'COLLECTED' }, { method: 'DRIVER_SELF_REPORT' }, { proof: 'CLIENT_ASSERTED_VALID' },
    { exception: 'UNKNOWN' }, { viewer: 'ADMIN_ALL_TENANTS' }, { response: 'HTTP_200_PAYMENT_RELEASED' },
  ]) assert.throws(() => at(change), RangeError);
});
test('results are frozen and never include a financial release or credential field', () => {
  const v = at(); assert.equal(Object.isFrozen(v), true);
  assert.equal(JSON.stringify(v).includes('payoutPermitted":true'), false);
  assert.equal(JSON.stringify(v).includes('secret'), false);
});
