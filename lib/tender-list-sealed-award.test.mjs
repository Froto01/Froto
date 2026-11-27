import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../app/api/tenders/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const date = new Date('2025-01-01T00:00:00Z');
const winningId = 'sealed-winning-response-id';
const loserId = 'losing-response-id';
const fixture = (awarded = true) => ({
  id: 'fixture-tender', companyId: 'owner-co', company: { name: 'Buyer', verified: true },
  status: awarded ? 'AWARDED' : 'OPEN', awardedResponseId: awarded ? winningId : null,
  awardedAt: awarded ? date : null, deliveryDate: date, responseClosesAt: awarded ? date : new Date('2099-01-01'), createdAt: date,
  responses: [{ id: winningId, companyId: 'winner-co', amount: 987.65 }, { id: loserId, companyId: 'loser-co', amount: 456.78 }],
});
async function get(companyId, { signedIn = true, missingUser = false, awarded = true } = {}) {
  const model = {
    user: { findUnique: async () => missingUser ? null : ({ id: 'fixture-user', companies: companyId ? [{ companyId, role: 'STAFF' }] : [] }) },
    tender: { findMany: async ({ where }) => {
      assert.deepEqual(where, { status: { in: ['OPEN', 'AWARDED'] } });
      return [fixture(awarded)];
    } },
  };
  const m = { exports: {} };
  const requireMock = name => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: signedIn ? 'fixture-session' : null }) };
    if (name === 'next/server') return { NextResponse: { json: body => JSON.parse(JSON.stringify(body)) } };
    if (name === '@/lib/prisma') return { prisma: model };
    if (name === '@/lib/opportunity-alerts') return { notifyMatchingOpportunity: () => { throw Error('Unexpected notification'); } };
    throw Error('Unexpected import: ' + name);
  };
  new Function('require', 'module', 'exports', compiled)(requireMock, m, m.exports);
  const [result] = await m.exports.GET();
  return result;
}
function assertSealed(result) {
  assert.equal(result.awardedResponseId, null);
  assert.equal(result.status, 'AWARDED');
  assert.equal(result.awardedAt, date.toISOString());
  assert.equal(result.responseCount, 2);
  assert.equal(JSON.stringify(result).includes(winningId), false);
  assert.equal(JSON.stringify(result).includes('987.65'), false);
}
test('losing supplier retains own price but never receives the winning ID', async () => {
  const result = await get('loser-co');
  assertSealed(result);
  assert.equal(result.hasResponded, true);
  assert.equal(result.viewerResponseAmount, 456.78);
});
test('unrelated company sees public awarded state only', async () => {
  const result = await get('other-co');
  assertSealed(result);
  assert.equal(result.hasResponded, false);
  assert.equal(result.viewerResponseAmount, null);
});
test('signed-out visitor cannot see winning ID', async () => assertSealed(await get(null, { signedIn: false })));
test('guest without company cannot see winning ID', async () => assertSealed(await get(null)));
test('unprovisioned session cannot see winning ID', async () => assertSealed(await get(null, { missingUser: true })));
test('owner retains winning ID and public award state', async () => {
  const result = await get('owner-co');
  assert.equal(result.isOwner, true);
  assert.equal(result.awardedResponseId, winningId);
  assert.equal(result.status, 'AWARDED');
});
test('winning supplier retains own ID and price, not competing price', async () => {
  const result = await get('winner-co');
  assert.equal(result.awardedResponseId, winningId);
  assert.equal(result.viewerResponseAmount, 987.65);
  assert.equal(JSON.stringify(result).includes('456.78'), false);
});
test('pre-award own price and open state are preserved', async () => {
  const result = await get('loser-co', { awarded: false });
  assert.equal(result.status, 'OPEN');
  assert.equal(result.awardedResponseId, null);
  assert.equal(result.viewerResponseAmount, 456.78);
});
