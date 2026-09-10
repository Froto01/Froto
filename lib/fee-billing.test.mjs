import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billingEvent } from './fee-billing.ts';
const now = new Date('2026-09-09T04:00:00Z');
const base = { action: 'INVOICED', status: 'EARNED', reference: 'INV-1', date: '2026-09-09', amount: '41.71', feeIncGst: '41.71', earliestDate: '2026-09-08', actorUserId: 'admin', confirmed: true };
test('earned invoice and invoiced full payment preserve GST-inclusive amount and actor', () => {
  assert.equal(billingEvent(base, now).amount, '41.71');
  assert.equal(billingEvent({ ...base, action: 'PAID', status: 'INVOICED' }, now).actorUserId, 'admin');
});
test('reject premature, repeated and reversed transitions', () => {
  for (const status of ['CALCULATED', 'INVOICED', 'PAID', 'VOID', 'WAIVED', 'REFUNDED']) assert.throws(() => billingEvent({ ...base, status }, now));
  for (const status of ['CALCULATED', 'EARNED', 'PAID']) assert.throws(() => billingEvent({ ...base, action: 'PAID', status }, now));
});
test('reject partial, excess and malformed payments', () => {
  for (const amount of ['37.92', '41.70', '41.72', '-41.71', '41.710', '4.171e1', '']) assert.throws(() => billingEvent({ ...base, amount }, now));
});
test('reject invalid dates, missing reference and unconfirmed receipt', () => {
  for (const date of ['2026-02-30', '2026-09-10', '2026-09-07', '']) assert.throws(() => billingEvent({ ...base, date }, now));
  assert.throws(() => billingEvent({ ...base, reference: ' ' }, now));
  assert.throws(() => billingEvent({ ...base, confirmed: false }, now));
});
