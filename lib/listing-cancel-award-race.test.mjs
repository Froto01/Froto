import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Tests execute the actual route with synthetic identities and mocked Prisma.
// No network, credential-bearing UAT, payment or real PostgreSQL operations.
const src = readFileSync(fileURLToPath(new URL('../app/api/listings/[id]/cancel/route.ts', import.meta.url)), 'utf8');
const compiled = ts.transpileModule(src, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const context = { params: Promise.resolve({ id: 'listing-1' }) };
const originalRow = (status = 'ACTIVE') => ({
  id: 'listing-1', companyId: 'owner', status, awardedBidId: null, title: 'Synthetic listing',
});
const user = (companyId = 'owner', role = 'OWNER') => ({
  id: 'user', companies: companyId ? [{ companyId, role }] : [],
});
function harness({ actor = user(), signedIn = true, row = originalRow(), lostClaim = false, unexpected = null } = {}) {
  const reads = [], writes = [];
  const tx = { listing: {
    findUnique: async () => { reads.push('listing'); return row; },
    update: async () => { throw Error('Unsafe unconditional update'); },
    updateMany: async ({ where, data }) => {
      reads.push('conditional-claim');
      assert.equal(where.id, 'listing-1');
      assert.equal(where.companyId, 'owner');
      assert.equal(where.awardedBidId, null);
      assert.equal(where.status, row.status);
      assert.deepEqual(data, { status: 'CANCELLED' });
      if (lostClaim) return { count: 0 };
      writes.push(data);
      row.status = data.status;
      return { count: 1 };
    },
  } };
  const prisma = {
    user: { findUnique: async () => { reads.push('user'); return actor; } },
    $transaction: async fn => { reads.push('transaction'); if (unexpected) throw unexpected; return fn(tx); },
  };
  const mockModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: signedIn ? 'synthetic-clerk' : null }) };
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } };
    if (name === '@/lib/prisma') return { prisma };
    throw Error('Unexpected import ' + name);
  }, mockModule, mockModule.exports);
  return { POST: mockModule.exports.POST, reads, writes, row };
}
const req = {};
test('signed-out request returns 401 before any DB access', async () => {
  const h = harness({ signedIn: false });
  assert.equal((await h.POST(req, context)).status, 401);
  assert.deepEqual(h.reads, []);
});
test('no company membership returns 409 before transaction', async () => {
  const h = harness({ actor: user(null) });
  assert.equal((await h.POST(req, context)).status, 409);
  assert.deepEqual(h.reads, ['user']);
});
test('staff role returns 403 before transaction', async () => {
  const h = harness({ actor: user('owner', 'STAFF') });
  assert.equal((await h.POST(req, context)).status, 403);
  assert.deepEqual(h.reads, ['user']);
});
test('other tenant cannot cancel a listing', async () => {
  const h = harness({ actor: user('outsider') });
  assert.equal((await h.POST(req, context)).status, 403);
  assert.equal(h.writes.length, 0);
});
test('missing listing returns 404 without a write', async () => {
  const h = harness({ row: null });
  assert.equal((await h.POST(req, context)).status, 404);
  assert.equal(h.writes.length, 0);
});
for (const [name, row] of [
  ['already awarded', { ...originalRow('AWARDED'), awardedBidId: 'winner' }],
  ['active with awarded marker', { ...originalRow(), awardedBidId: 'winner' }],
  ['already cancelled', originalRow('CANCELLED')],
  ['invalid state', originalRow('DRAFT')],
]) {
  test(name + ' is denied without mutation', async () => {
    const h = harness({ row });
    assert.equal((await h.POST(req, context)).status, 409);
    assert.equal(h.writes.length, 0);
  });
}
for (const state of ['ACTIVE', 'PAUSED']) {
  test(state + ' cancellation uses one tenant-scoped conditional claim', async () => {
    const h = harness({ row: originalRow(state) });
    const response = await h.POST(req, context);
    assert.equal(response.status, 200);
    assert.equal(h.row.status, 'CANCELLED');
    assert.equal(h.writes.length, 1);
    assert.deepEqual(h.reads, ['user', 'transaction', 'listing', 'conditional-claim']);
  });
}
test('lost concurrent award/state claim returns 409, no overwrite', async () => {
  const h = harness({ lostClaim: true });
  const response = await h.POST(req, context);
  assert.equal(response.status, 409);
  assert.match(response.body.error, /Refresh and try again/);
  assert.equal(h.row.status, 'ACTIVE');
  assert.equal(h.writes.length, 0);
});
test('unexpected transaction error is not swallowed', async () => {
  const err = Error('Unexpected synthetic DB error');
  const h = harness({ unexpected: err });
  await assert.rejects(h.POST(req, context), e => e === err);
});
