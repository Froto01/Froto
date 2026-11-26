import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const file = new URL('../app/api/tenders/[id]/route.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const date = new Date('2025-01-01T00:00:00Z');
const response = (id, companyId, name, amount) => ({
  id, companyId, amount, company: { name, verified: true },
  serviceDescription: id + '-service', notes: id + '-notes', leadTime: 'fixture',
  status: 'SUBMITTED', createdAt: date,
});
const winner = response('private-winning-id', 'winner-company', 'Private Winner Name', 987.65);
const loser = response('loser-id', 'loser-company', 'Losing Supplier', 456.78);
const tender = (awarded = true) => ({
  id: 'tender-fixture', companyId: 'buyer-company', company: { name: 'Buyer', verified: true },
  status: awarded ? 'AWARDED' : 'OPEN', deliveryDate: date, responseClosesAt: date,
  awardedResponseId: awarded ? winner.id : null, awardedAt: awarded ? date : null,
  responses: [winner, loser], createdAt: date,
  job: awarded ? { id: 'private-job', status: 'AWARDED', buyerCompanyId: 'buyer-company', providerCompanyId: 'winner-company' } : null,
});
async function get(companyId, { signedIn = true, awarded = true, role = 'OWNER', missing = false } = {}) {
  const model = {
    user: { findUnique: async () => ({ id: 'fixture-user', companies: companyId ? [{ companyId, role }] : [] }) },
    tender: { findUnique: async ({ where }) => {
      assert.deepEqual(where, { id: 'tender-fixture' });
      return missing ? null : tender(awarded);
    } },
  };
  const m = { exports: {} };
  const requireMock = name => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: signedIn ? 'fixture-session' : null }) };
    if (name === 'next/server') return { NextResponse: { json: (body, opts = {}) => ({ body: JSON.parse(JSON.stringify(body)), status: opts.status ?? 200 }) } };
    if (name === '@/lib/prisma') return { prisma: model };
    throw Error('Unexpected import: ' + name);
  };
  new Function('require', 'module', 'exports', compiled)(requireMock, m, m.exports);
  return m.exports.GET({}, { params: Promise.resolve({ id: 'tender-fixture' }) });
}
function assertPrivate(body) {
  assert.equal(body.awardedResponseId, null);
  assert.equal(body.awardedCompanyName, null);
  assert.equal(body.awardedAmount, null);
  assert.equal(body.jobId, null);
  assert.equal(body.canOpenJob, false);
  assert.equal(body.tenderState, 'AWARDED');
  for (const secret of [winner.id, winner.company.name, String(winner.amount), winner.companyId, 'private-job']) {
    assert.equal(JSON.stringify(body).includes(secret), false, 'leaked ' + secret);
  }
}
test('losing supplier sees its own price and unsuccessful status, not winning offer', async () => {
  const { status, body } = await get('loser-company');
  assert.equal(status, 200);
  assertPrivate(body);
  assert.equal(body.viewerResponseAmount, 456.78);
  assert.equal(body.viewerResponseStatus, 'UNSUCCESSFUL');
  assert.deepEqual(body.responses.map(r => r.id), [loser.id]);
});
test('nonparticipating company sees awarded state but no private award details', async () => {
  const { body } = await get('other-company');
  assertPrivate(body); assert.deepEqual(body.responses, []);
});
test('signed-out public response keeps awarded state but not private award details', async () => {
  const { status, body } = await get(null, { signedIn: false });
  assert.equal(status, 200); assertPrivate(body); assert.deepEqual(body.responses, []);
});
test('signed-in user without company receives no private award details', async () => {
  const { body } = await get(null);
  assertPrivate(body); assert.deepEqual(body.responses, []);
});
test('winning company retains its own award amount, status and job link, not losing price', async () => {
  const { body } = await get('winner-company');
  assert.equal(body.awardedResponseId, winner.id);
  assert.equal(body.awardedAmount, winner.amount);
  assert.equal(body.awardedCompanyName, winner.company.name);
  assert.equal(body.viewerResponseStatus, 'AWARDED');
  assert.equal(body.jobId, 'private-job');
  assert.equal(body.canOpenJob, true);
  assert.deepEqual(body.responses.map(r => r.id), [winner.id]);
  assert.equal(JSON.stringify(body).includes(String(loser.amount)), false);
});
test('tender owner retains both offers and awarded job details', async () => {
  const { body } = await get('buyer-company');
  assert.equal(body.awardedAmount, winner.amount);
  assert.equal(body.awardedResponseId, winner.id);
  assert.equal(body.awardedCompanyName, winner.company.name);
  assert.equal(body.jobId, 'private-job');
  assert.deepEqual(body.responses.map(r => r.id), [winner.id, loser.id]);
});
test('existing owner staff view permissions are unchanged', async () => {
  const { body } = await get('buyer-company', { role: 'STAFF' });
  assert.equal(body.isOwner, true);
  assert.equal(body.canManage, undefined);
  assert.equal(body.canAward, false);
  assert.equal(body.awardedAmount, winner.amount);
});
test('before award, competing prices remain sealed and own response is visible', async () => {
  const { body } = await get('loser-company', { awarded: false });
  assert.equal(body.awardedAmount, null);
  assert.equal(body.awardedResponseId, null);
  assert.equal(body.viewerResponseStatus, 'SUBMITTED');
  assert.deepEqual(body.responses.map(r => r.id), [loser.id]);
  assert.equal(JSON.stringify(body).includes(String(winner.amount)), false);
});
test('missing tender still returns 404', async () => {
  assert.equal((await get('buyer-company', { missing: true })).status, 404);
});
