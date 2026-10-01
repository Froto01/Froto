import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { calculateTransactionFee } from './fee-engine.mjs';

const source = readFileSync(new URL('./fee-snapshots.ts', import.meta.url), 'utf8');
const compiledModule = { exports: {} };
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function('require', 'module', 'exports', code)((name) => {
  assert.equal(name, '@/lib/fee-engine.mjs');
  return { calculateTransactionFee };
}, compiledModule, compiledModule.exports);
const { createJobFeeSnapshotIfApplicable, createGuestAuctionFeeSnapshotIfApplicable } = compiledModule.exports;

const calculatedAt = new Date('2026-10-01T00:00:00Z');
const rule = (overrides = {}) => ({ id: 'rule-1', code: 'UAT', version: 1, payerType: 'PROVIDER', percentageBps: 300, gstBps: 1000, minimumFee: null, maximumFee: null, ...overrides });
function fixture(transactionType, rules, existing = null) {
  const calls = [];
  const writes = [];
  const rows = new Map(existing ? [[`${transactionType}:source`, existing]] : []);
  const tx = {
    feeRule: { findMany: async (query) => {
      assert.equal(query.where.transactionType, transactionType);
      assert.equal(query.where.active, true);
      assert.equal(query.take, 2);
      assert.deepEqual(query.where.AND, [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: calculatedAt } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gt: calculatedAt } }] },
      ]);
      calls.push(query);
      return rules;
    } },
    transactionFee: { upsert: async (args) => {
      assert.deepEqual(args.update, {});
      assert.equal(args.where.idempotencyKey, `${transactionType}:source`);
      assert.equal(args.create.idempotencyKey, args.where.idempotencyKey);
      if (!rows.has(args.where.idempotencyKey)) {
        writes.push(args.create);
        rows.set(args.where.idempotencyKey, { id: 'fee-1', ...args.create });
      }
      return rows.get(args.where.idempotencyKey);
    } },
  };
  const input = { tx, transactionType, sourceId: 'source', transactionAmount: '500.00', buyerCompanyId: 'buyer', providerCompanyId: 'provider', calculatedAt, metadata: { test: true } };
  const create = (overrides = {}) => transactionType === 'GUEST_AUCTION'
    ? createGuestAuctionFeeSnapshotIfApplicable({ ...input, buyerCompanyId: undefined, ...overrides })
    : createJobFeeSnapshotIfApplicable({ ...input, ...overrides });
  return { create, calls, writes, rows };
}

for (const transactionType of ['MARKETPLACE_JOB', 'TENDER_JOB', 'GUEST_AUCTION']) {
  test(`${transactionType} with no active rule creates no snapshot`, async () => {
    const f = fixture(transactionType, []);
    assert.equal(await f.create(), null);
    assert.equal(f.writes.length, 0);
  });
  test(`${transactionType} overlapping rules fail closed before snapshot write`, async () => {
    const f = fixture(transactionType, [rule(), rule({ id: 'rule-2', version: 2 })]);
    await assert.rejects(f.create(), /Multiple active/);
    assert.equal(f.writes.length, 0);
  });
  test(`${transactionType} unsupported GUEST payer fails before snapshot write`, async () => {
    const f = fixture(transactionType, [rule({ payerType: 'GUEST' })]);
    await assert.rejects(f.create(), /must use BUYER or PROVIDER/);
    assert.equal(f.writes.length, 0);
  });
  test(`${transactionType} provider snapshot preserves rule, payer, money and metadata`, async () => {
    const f = fixture(transactionType, [rule()]);
    const result = await f.create();
    assert.equal(result.payerCompanyId, 'provider');
    assert.equal(result.transactionType, transactionType);
    assert.equal(result.feeRuleId, 'rule-1');
    assert.equal(result.feeRuleCode, 'UAT');
    assert.equal(result.feeRuleVersion, 1);
    assert.equal(result.transactionAmount, '500.00');
    assert.equal(result.percentageBps, 300);
    assert.equal(result.gstBps, 1000);
    assert.equal(result.feeExGst, '15.00');
    assert.equal(result.gstAmount, '1.50');
    assert.equal(result.feeIncGst, '16.50');
    assert.deepEqual(result.metadata, { test: true });
    assert.equal(f.writes.length, 1);
  });
  test(`${transactionType} retains an existing immutable snapshot after rule changes`, async () => {
    const existing = { id: 'original-fee', feeRuleVersion: 1, feeExGst: '15.00', payerCompanyId: 'original-payer', metadata: { original: true } };
    const f = fixture(transactionType, [rule({ version: 2, percentageBps: 500 })], existing);
    assert.strictEqual(await f.create(), existing);
    assert.equal(f.writes.length, 0);
  });
  test(`${transactionType} repeated concurrent helper calls use the same idempotency key`, async () => {
    const f = fixture(transactionType, [rule()]);
    const responses = await Promise.all([f.create(), f.create()]);
    assert.strictEqual(responses[0], responses[1]);
    assert.equal(f.rows.size, 1);
    assert.equal(f.writes.length, 1);
  });
}
for (const transactionType of ['MARKETPLACE_JOB', 'TENDER_JOB']) {
  test(`${transactionType} BUYER rule selects the buyer rather than provider`, async () => {
    const f = fixture(transactionType, [rule({ payerType: 'BUYER' })]);
    assert.equal((await f.create()).payerCompanyId, 'buyer');
  });
}
test('guest award cannot apply a buyer-paid rule without a buyer company', async () => {
  const f = fixture('GUEST_AUCTION', [rule({ payerType: 'BUYER' })]);
  await assert.rejects(f.create(), /without a buyer company/);
  assert.equal(f.writes.length, 0);
});
test('snapshot applies minimum and maximum fee values through the real calculator', async () => {
  const f = fixture('MARKETPLACE_JOB', [rule({ minimumFee: '20.00', maximumFee: '25.00' })]);
  const result = await f.create();
  assert.equal(result.feeExGst, '20.00');
  assert.equal(result.gstAmount, '2.00');
  assert.equal(result.feeIncGst, '22.00');
  const capped = fixture('MARKETPLACE_JOB', [rule({ minimumFee: '20.00', maximumFee: '25.00' })]);
  const capResult = await capped.create({ transactionAmount: '1000.00' });
  assert.equal(capResult.feeExGst, '25.00');
  assert.equal(capResult.gstAmount, '2.50');
  assert.equal(capResult.feeIncGst, '27.50');
});
for (const amount of ['19.999', 'not-a-number', '90071992547409.99']) {
  test(`snapshot rejects unsupported money ${amount} before writing`, async () => {
    const f = fixture('MARKETPLACE_JOB', [rule()]);
    await assert.rejects(f.create({ transactionAmount: amount }), /currency value|supported fee-calculation range/i);
    assert.equal(f.writes.length, 0);
  });
}
