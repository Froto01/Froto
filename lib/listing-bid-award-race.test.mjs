import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Secret-free real-handler synthetic tests. No real PostgreSQL, auth or email.
const file = fileURLToPath(new URL('../app/api/listings/[id]/bids/route.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const req = (amount = 110) => ({ json: async () => ({ amount }) });
const context = { params: Promise.resolve({ id: 'listing-1' }) };
const listing = () => ({
  id: 'listing-1', title: 'Synthetic capacity', companyId: 'owner-company',
  status: 'ACTIVE', awardedBidId: null, biddingClosesAt: null,
  startingBid: 100, minimumBidIncrement: 5,
});
const user = { id: 'user-1', companies: [{
  companyId: 'bidder-company', role: 'STAFF',
  company: { name: 'Synthetic provider', verified: false },
}] };

function harness({
  signedIn = true, actor = user, rows = [{ id: 'listing-1' }],
  row = listing(), highest = null, conflicts = 0, fatal = null,
} = {}) {
  const trace = [], writes = [];
  const tx = {
    $queryRaw: async (strings, ...values) => {
      trace.push('lock');
      assert.match(strings.join('?'), /SELECT "id" FROM "Listing" WHERE "id" = \? FOR UPDATE/);
      assert.deepEqual(values, ['listing-1']);
      return rows;
    },
    listing: { findUnique: async ({ where }) => {
      trace.push('read');
      assert.deepEqual(where, { id: 'listing-1' });
      return row;
    } },
    bid: {
      findFirst: async ({ where }) => {
        trace.push('highest');
        assert.deepEqual(where, { listingId: 'listing-1' });
        return highest;
      },
      create: async ({ data }) => {
        trace.push('insert');
        assert.equal(data.listingId, 'listing-1');
        assert.equal(data.bidderCompanyId, 'bidder-company');
        assert.equal(data.placedByUserId, 'user-1');
        writes.push(data);
        return { id: 'bid-1', ...data, createdAt: new Date('2026-11-20T00:00:00Z') };
      },
    },
    notification: { create: async ({ data }) => {
      trace.push('notify');
      assert.equal(data.metadata.listingId, 'listing-1');
      return data;
    } },
  };
  const prisma = {
    user: { findUnique: async () => { trace.push('user'); return actor; } },
    $transaction: async (fn, options) => {
      trace.push('transaction');
      assert.equal(options.isolationLevel, 'Serializable');
      if (fatal) throw fatal;
      if (conflicts > 0) {
        conflicts--;
        throw Object.assign(new Error('Synthetic conflict'), { code: 'P2034' });
      }
      return fn(tx);
    },
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: signedIn ? 'test-clerk-user' : null }) };
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ status: options.status ?? 200, body }) } };
    if (name === '@/lib/prisma') return { prisma };
    throw new Error('Unexpected import ' + name);
  }, mod, mod.exports);
  return { POST: mod.exports.POST, trace, writes };
}
test('unsigned denies before DB', async () => {
  const h = harness({ signedIn: false });
  assert.equal((await h.POST(req(), context)).status, 401);
  assert.deepEqual(h.trace, []);
});
test('unknown user denies before transaction', async () => {
  const h = harness({ actor: null });
  assert.equal((await h.POST(req(), context)).status, 409);
  assert.deepEqual(h.trace, ['user']);
});
test('company-less user denies before transaction', async () => {
  const h = harness({ actor: { id: 'user-1', companies: [] } });
  assert.equal((await h.POST(req(), context)).status, 409);
  assert.deepEqual(h.trace, ['user']);
});
test('invalid JSON and decimal precision do not touch DB', async () => {
  const h = harness();
  assert.equal((await h.POST({ json: async () => { throw Error('bad'); } }, context)).status, 400);
  assert.equal((await h.POST(req(109.999), context)).status, 400);
  assert.deepEqual(h.trace, []);
});
test('parent row missing at lock stops before read or insert', async () => {
  const h = harness({ rows: [] });
  assert.equal((await h.POST(req(), context)).status, 404);
  assert.deepEqual(h.trace, ['user', 'transaction', 'lock']);
});
test('deleted parent under lock is rejected', async () => {
  const h = harness({ row: null });
  assert.equal((await h.POST(req(), context)).status, 404);
  assert.deepEqual(h.trace, ['user', 'transaction', 'lock', 'read']);
});
for (const [name, diff] of [
  ['already awarded', { status: 'AWARDED', awardedBidId: 'winner' }],
  ['award marker', { awardedBidId: 'winner' }],
  ['inactive', { status: 'CANCELLED' }],
  ['expired', { biddingClosesAt: new Date(0) }],
  ['self-bid', { companyId: 'bidder-company' }],
]) {
  test(name + ' denies before bid insert or notification', async () => {
    const h = harness({ row: { ...listing(), ...diff } });
    assert.equal((await h.POST(req(), context)).status, name === 'self-bid' ? 400 : 409);
    assert.deepEqual(h.trace, ['user', 'transaction', 'lock', 'read']);
    assert.equal(h.writes.length, 0);
  });
}
test('re-read latest highest bid under lock before amount check', async () => {
  const h = harness({ highest: { amount: 120, bidderCompanyId: 'other' } });
  assert.equal((await h.POST(req(120), context)).status, 400);
  assert.deepEqual(h.trace, ['user', 'transaction', 'lock', 'read', 'highest']);
});
test('bid writes once, only after locking and rechecking', async () => {
  const h = harness();
  const result = await h.POST(req(), context);
  assert.equal(result.status, 201);
  assert.equal(result.body.bid.id, 'bid-1');
  assert.equal(result.body.minimumNextBid, 115);
  assert.deepEqual(h.trace, ['user', 'transaction', 'lock', 'read', 'highest', 'insert', 'notify']);
  assert.equal(h.writes.length, 1);
});
test('P2034 retries and then re-locks current parent before write', async () => {
  const h = harness({ conflicts: 2 });
  assert.equal((await h.POST(req(), context)).status, 201);
  assert.equal(h.trace.filter(x => x === 'transaction').length, 3);
  assert.equal(h.trace.filter(x => x === 'lock').length, 1);
  assert.equal(h.writes.length, 1);
});
test('three P2034 conflicts return 409, not an unhandled 500', async () => {
  const h = harness({ conflicts: 4 });
  const res = await h.POST(req(), context);
  assert.equal(res.status, 409);
  assert.match(res.body.error, /Refresh and try again/);
  assert.equal(h.trace.filter(x => x === 'transaction').length, 3);
  assert.equal(h.writes.length, 0);
});
test('unexpected transaction failure is not hidden', async () => {
  const error = Error('Unexpected synthetic database failure');
  const h = harness({ fatal: error });
  await assert.rejects(h.POST(req(), context), ex => ex === error);
  assert.equal(h.writes.length, 0);
});
