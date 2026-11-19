import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Isolated, secret-free handler assertions. All unexpected database operations fail.
const path = fileURLToPath(new URL('../app/api/tenders/[id]/responses/route.ts', import.meta.url));
const source = readFileSync(path, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const baseTender = () => ({
  id: 'tender-1', title: 'Synthetic load', companyId: 'buyer-company',
  status: 'OPEN', awardedResponseId: null, responseClosesAt: new Date(Date.now() + 60000),
});
const request = (body = { amount: 250 }) => ({ json: async () => body });
const context = { params: Promise.resolve({ id: 'tender-1' }) };
const membership = { companyId: 'supplier-company', role: 'STAFF' };
const viewer = { id: 'synthetic-user', companies: [membership] };

function route({ user = viewer, authenticated = true, rows = [{ id: 'tender-1' }], tender = baseTender(), error = null } = {}) {
  const trace = [];
  const forbidden = name => () => { throw new Error(`Unexpected query or write: ${name}`); };
  const tx = {
    $queryRaw: async (strings, ...values) => {
      trace.push('lock');
      assert.match(strings.join('?'), /SELECT "id" FROM "Tender" WHERE "id" = \? FOR UPDATE/);
      assert.deepEqual(values, ['tender-1']);
      return rows;
    },
    tender: { findUnique: async ({ where }) => {
      trace.push('read');
      assert.deepEqual(where, { id: 'tender-1' });
      return tender;
    } },
    tenderResponse: { create: async ({ data }) => {
      trace.push('insert');
      assert.equal(data.tenderId, 'tender-1');
      assert.equal(data.companyId, 'supplier-company');
      assert.equal(data.submittedByUserId, 'synthetic-user');
      return { id: 'response-1', amount: data.amount };
    } },
    notification: { create: async ({ data }) => {
      trace.push('notify');
      assert.equal(data.companyId, 'buyer-company');
      assert.equal(data.metadata.respondingCompanyId, 'supplier-company');
      return {};
    } },
  };
  const prisma = {
    user: { findUnique: async () => user },
    $transaction: async (fn, options) => {
      trace.push('transaction');
      assert.equal(options.isolationLevel, 'Serializable');
      if (error) throw error;
      return fn(tx);
    },
  };
  for (const name of ['guestAuction', 'feeRule', 'transactionFee']) prisma[name] = new Proxy({}, { get: () => forbidden(name) });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: authenticated ? 'clerk-test' : null }) };
    if (name === 'next/server') return { NextResponse: { json: (data, options = {}) => ({ status: options.status ?? 200, body: data }) } };
    if (name === '@/lib/prisma') return { prisma };
    throw new Error(`Unexpected module import: ${name}`);
  }, module, module.exports);
  return { POST: module.exports.POST, trace };
}

test('unsigned request is denied before any database query', async () => {
  const r = route({ authenticated: false });
  assert.equal((await r.POST(request(), context)).status, 401);
  assert.deepEqual(r.trace, []);
});
test('unregistered user is denied before transaction', async () => {
  const r = route({ user: null });
  assert.equal((await r.POST(request(), context)).status, 403);
  assert.deepEqual(r.trace, []);
});
test('user with no company membership cannot respond', async () => {
  const r = route({ user: { id: 'synthetic-user', companies: [] } });
  assert.equal((await r.POST(request(), context)).status, 403);
  assert.deepEqual(r.trace, []);
});
test('bad JSON and nonpositive amount do not start transaction', async () => {
  const r = route();
  assert.equal((await r.POST({ json: async () => { throw new SyntaxError('no json'); } }, context)).status, 400);
  assert.equal((await r.POST(request({ amount: 0 }), context)).status, 400);
  assert.deepEqual(r.trace, []);
});
test('parent row missing stops before response insert', async () => {
  const r = route({ rows: [] });
  assert.equal((await r.POST(request(), context)).status, 404);
  assert.deepEqual(r.trace, ['transaction', 'lock']);
});
test('tender deleted after lock stops before insert', async () => {
  const r = route({ tender: null });
  assert.equal((await r.POST(request(), context)).status, 404);
  assert.deepEqual(r.trace, ['transaction', 'lock', 'read']);
});
test('own company is denied after parent lock', async () => {
  const r = route({ tender: { ...baseTender(), companyId: 'supplier-company' } });
  assert.equal((await r.POST(request(), context)).status, 403);
  assert.deepEqual(r.trace, ['transaction', 'lock', 'read']);
});
for (const [name, changes] of [
  ['already awarded', { status: 'AWARDED', awardedResponseId: 'winning-response' }],
  ['closed', { status: 'CLOSED' }],
  ['awarded marker only', { awardedResponseId: 'winning-response' }],
  ['expired', { responseClosesAt: new Date(0) }],
]) {
  test(`tender ${name} after lock returns 409 with no writes`, async () => {
    const r = route({ tender: { ...baseTender(), ...changes } });
    assert.equal((await r.POST(request(), context)).status, 409);
    assert.deepEqual(r.trace, ['transaction', 'lock', 'read']);
  });
}
test('valid sealed response inserts and notifies only after lock and recheck', async () => {
  const r = route();
  const response = await r.POST(request({ amount: 250, serviceDescription: 'Test service' }), context);
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { success: true, responseId: 'response-1', amount: 250 });
  assert.deepEqual(r.trace, ['transaction', 'lock', 'read', 'insert', 'notify']);
});
for (const code of ['P2002', 'P2034']) {
  test(`database ${code} contention maps to conflict without writes`, async () => {
    const r = route({ error: Object.assign(new Error('synthetic failure'), { code }) });
    assert.equal((await r.POST(request(), context)).status, 409);
    assert.deepEqual(r.trace, ['transaction']);
  });
}
test('unexpected database failure remains observable to server error handling', async () => {
  const failure = new Error('unexpected synthetic DB failure');
  const r = route({ error: failure });
  await assert.rejects(r.POST(request(), context), e => e === failure);
});
