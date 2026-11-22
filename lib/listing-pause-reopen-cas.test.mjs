import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Actual handler in a secret-free synthetic environment. Unexpected writes fail.
const routePath = 'app/api/listings/[id]/status/route.ts';
const source = readFileSync(fileURLToPath(new URL(`../${routePath}`, import.meta.url)), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const baseListing = () => ({
  id: 'source', companyId: 'owner-company', status: 'ACTIVE', awardedBidId: null,
  biddingClosesAt: new Date(Date.now() + 86400000), availableTo: new Date(Date.now() + 172800000),
});
function load({ signedIn = true, companyId = 'owner-company', role = 'OWNER', listing = baseListing(),
  claimCount = 1, error, invalidJson = false } = {}) {
  const calls = [];
  const viewer = companyId ? { companies: [{ companyId, role }] } : { companies: [] };
  const prisma = {
    user: { findUnique: async () => viewer },
    listing: {
      findUnique: async ({ where }) => {
        calls.push('read');
        assert.equal(where.id, 'source');
        return listing;
      },
      updateMany: async ({ where, data }) => {
        calls.push('claim');
        assert.equal(where.id, 'source');
        assert.equal(where.companyId, 'owner-company');
        assert.equal(where.awardedBidId, null);
        assert.equal(where.status, data.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED');
        if (data.status === 'ACTIVE') {
          assert.ok(where.biddingClosesAt.gt instanceof Date);
          assert.ok(where.availableTo.gte instanceof Date);
        } else {
          assert.equal(where.biddingClosesAt, undefined);
        }
        if (error) throw error;
        return { count: claimCount };
      },
      update: () => { throw new Error('Unsafe unconditional update called'); },
    },
    $transaction: async (fn) => fn(prisma),
  };
  const compiledModule = { exports: {} };
  const require = (name) => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: signedIn ? 'synthetic-user' : null }) };
    if (name === 'next/server') return { NextResponse: { json: (body, opts = {}) => ({ status: opts.status ?? 200, body }) } };
    if (name === '@/lib/prisma') return { prisma };
    throw Error(`Unrecognised import ${name}`);
  };
  new Function('require', 'module', 'exports', compiled)(require, compiledModule, compiledModule.exports);
  return {
    calls,
    invoke: (action = 'PAUSE') => compiledModule.exports.POST(
      { json: async () => { if (invalidJson) throw Error('invalid JSON'); return { action }; } },
      { params: Promise.resolve({ id: 'source' }) }
    ),
  };
}

test('signed-out user cannot read or alter listings', async () => {
  const x = load({ signedIn: false });
  assert.equal((await x.invoke()).status, 401); assert.deepEqual(x.calls, []);
});
test('no company membership is denied before listing access', async () => {
  const x = load({ companyId: null });
  assert.equal((await x.invoke()).status, 409); assert.deepEqual(x.calls, []);
});
test('staff cannot manage a listing', async () => {
  const x = load({ role: 'STAFF' });
  assert.equal((await x.invoke()).status, 403); assert.deepEqual(x.calls, []);
});
for (const action of ['PAUSE', 'REOPEN']) {
  test(`${action} rejects a rival tenant before any write`, async () => {
    const x = load({ listing: { ...baseListing(), companyId: 'rival-company' } });
    assert.equal((await x.invoke(action)).status, 403); assert.deepEqual(x.calls, ['read']);
  });
  test(`${action} rejects awarded listing without mutation`, async () => {
    const x = load({ listing: { ...baseListing(), status: 'AWARDED', awardedBidId: 'winner' } });
    assert.equal((await x.invoke(action)).status, 409); assert.deepEqual(x.calls, ['read']);
  });
  test(`${action} rejects a lost atomic claim with 409`, async () => {
    const x = load({ listing: { ...baseListing(), status: action === 'REOPEN' ? 'PAUSED' : 'ACTIVE' }, claimCount: 0 });
    assert.equal((await x.invoke(action)).status, 409); assert.deepEqual(x.calls, ['read', 'claim']);
  });
  test(`${action} accepts a single conditional status transition`, async () => {
    const x = load({ listing: { ...baseListing(), status: action === 'REOPEN' ? 'PAUSED' : 'ACTIVE' } });
    const r = await x.invoke(action);
    assert.equal(r.status, 200); assert.equal(r.body.status, action === 'REOPEN' ? 'ACTIVE' : 'PAUSED');
    assert.deepEqual(x.calls, ['read', 'claim']);
  });
}
test('missing listing denied without a write', async () => {
  const x = load({ listing: null });
  assert.equal((await x.invoke()).status, 404); assert.deepEqual(x.calls, ['read']);
});
test('invalid action denied before database work', async () => {
  const x = load();
  assert.equal((await x.invoke('CANCEL')).status, 400); assert.deepEqual(x.calls, []);
});
test('malformed JSON denied before database work', async () => {
  const x = load({ invalidJson: true });
  assert.equal((await x.invoke()).status, 400); assert.deepEqual(x.calls, []);
});
test('reopen with missing close time denied before mutation', async () => {
  const x = load({ listing: { ...baseListing(), status: 'PAUSED', biddingClosesAt: null } });
  assert.equal((await x.invoke('REOPEN')).status, 409); assert.deepEqual(x.calls, ['read']);
});
test('reopen with expired bidding window denied', async () => {
  const x = load({ listing: { ...baseListing(), status: 'PAUSED', biddingClosesAt: new Date(0) } });
  assert.equal((await x.invoke('REOPEN')).status, 409); assert.deepEqual(x.calls, ['read']);
});
test('reopen with expired availability denied', async () => {
  const x = load({ listing: { ...baseListing(), status: 'PAUSED', availableTo: new Date(0) } });
  assert.equal((await x.invoke('REOPEN')).status, 409); assert.deepEqual(x.calls, ['read']);
});
test('unexpected database errors remain observable', async () => {
  const failure = Error('unexpected DB failure');
  const x = load({ error: failure });
  await assert.rejects(x.invoke('PAUSE'), e => e === failure);
});
