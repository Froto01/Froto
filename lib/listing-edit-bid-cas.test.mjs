import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../app/api/listings/[id]/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const row = () => ({ id: 'listing-1', companyId: 'owner-company', status: 'ACTIVE', awardedBidId: null, _count: { bids: 0 } });
const payload = () => ({
  title: 'Synthetic listing', listingType: 'Transport Lane', origin: 'Fixture A', destination: 'Fixture B',
  capacityAmount: 10, capacityUnit: 'pallets', temperatureClass: 'ambient',
  availableFrom: '2099-01-01', availableTo: '2099-01-02', startingBid: 50,
  minimumBidIncrement: 5, biddingClosesAt: '2099-01-01T00:00:00Z', notes: 'synthetic',
});
function setup({ signedIn = true, user = true, company = 'owner-company', role = 'OWNER',
  listing = row(), count = 1, failure = null, body = payload() } = {}) {
  const calls = [];
  const tx = { listing: {
    findUnique: async (args) => {
      calls.push('read'); assert.deepEqual(args.where, { id: 'listing-1' });
      assert.deepEqual(args.include, { _count: { select: { bids: true } } }); return listing;
    },
    updateMany: async ({ where, data }) => {
      calls.push('claim');
      assert.deepEqual(where, { id: 'listing-1', companyId: 'owner-company', status: listing.status, awardedBidId: null, bids: { none: {} } });
      assert.equal(data.title, 'Synthetic listing'); assert.equal(data.startingBid, 50);
      assert.equal('status' in data, false); assert.equal('awardedBidId' in data, false);
      if (failure) throw failure;
      return { count };
    },
  } };
  const prisma = {
    user: { findUnique: async () => { calls.push('user'); return user ? { companies: company ? [{ companyId: company, role }] : [] } : null; } },
    $transaction: async (fn, options) => { calls.push('transaction'); assert.equal(options.isolationLevel, 'Serializable'); return fn(tx); },
    listing: { findUnique: async () => { throw Error('read outside transaction'); }, update: async () => { throw Error('unconditional write'); } },
  };
  const m = { exports: {} };
  const safeRequire = (name) => {
    if (name === '@/lib/logistics-units') return { isLogisticsUnit: (unit) => unit === 'pallets' };
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: signedIn ? 'fixture-clerk' : null }) };
    if (name === 'next/server') return { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200 }) } };
    if (name === '@/lib/prisma') return { prisma };
    throw Error('Unexpected import ' + name);
  };
  new Function('require', 'module', 'exports', compiled)(safeRequire, m, m.exports);
  return { calls, edit: () => m.exports.PATCH({ json: async () => body }, { params: Promise.resolve({ id: 'listing-1' }) }) };
}
for (const [name, config, status, calls] of [
  ['signed out', { signedIn: false }, 401, []],
  ['unregistered', { user: false }, 409, ['user']],
  ['no company', { company: null }, 409, ['user']],
  ['staff', { role: 'STAFF' }, 403, ['user']],
  ['unrelated company', { company: 'other-company' }, 403, ['user', 'transaction', 'read']],
  ['missing listing', { listing: null }, 404, ['user', 'transaction', 'read']],
  ['awarded status', { listing: { ...row(), status: 'AWARDED' } }, 409, ['user', 'transaction', 'read']],
  ['award marker', { listing: { ...row(), awardedBidId: 'winner' } }, 409, ['user', 'transaction', 'read']],
  ['cancelled', { listing: { ...row(), status: 'CANCELLED' } }, 409, ['user', 'transaction', 'read']],
  ['existing bid', { listing: { ...row(), _count: { bids: 1 } } }, 409, ['user', 'transaction', 'read']],
  ['invalid payload', { body: { ...payload(), capacityAmount: 0 } }, 400, ['user']],
  ['active edit', {}, 200, ['user', 'transaction', 'read', 'claim']],
  ['paused edit', { listing: { ...row(), status: 'PAUSED' } }, 200, ['user', 'transaction', 'read', 'claim']],
  ['lost conditional claim', { count: 0 }, 409, ['user', 'transaction', 'read', 'claim']],
  ['serialization conflict', { failure: Object.assign(Error('private driver detail'), { code: 'P2034' }) }, 409, ['user', 'transaction', 'read', 'claim']],
]) {
  test(name, async () => {
    const x = setup(config);
    const result = await x.edit();
    assert.equal(result.status, status);
    assert.deepEqual(x.calls, calls);
    assert.equal(JSON.stringify(result.body).includes('private driver detail'), false);
    if (status === 200) assert.deepEqual(result.body, { success: true, listingId: 'listing-1' });
  });
}
test('unexpected transaction failure does not become a successful edit', async () => {
  const x = setup({ failure: Error('synthetic unexpected error') });
  await assert.rejects(x.edit(), /synthetic unexpected error/);
});
