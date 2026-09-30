import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Exercise the real route handlers with synthetic identities and database rows.
// Any unexpected query/write fails, so a rejection must occur before mutation.
function handler(file, user, models = {}, signedIn = true) {
  const fail = (name) => () => { throw new Error(`Unexpected database operation: ${name}`); };
  const prisma = new Proxy({
    ...models,
    user: { findUnique: async () => user },
    $transaction: async (fn) => fn(prisma),
  }, { get(target, key) {
    if (key in target) return target[key];
    return new Proxy({}, { get: (_, method) => fail(`${String(key)}.${String(method)}`) });
  } });
  const source = readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  const require = (name) => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ userId: signedIn ? 'test-session' : null }) };
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ status: options.status ?? 200, body: JSON.parse(JSON.stringify(body)) }) } };
    if (name === 'next/navigation') return { redirect: (url) => { throw new Error(`REDIRECT:${url}`); } };
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/fee-snapshots') return { createJobFeeSnapshotIfApplicable: fail('create fee') };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('require', 'module', 'exports', code)(require, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const viewer = (companyId = 'company-b', role = 'OWNER', id = 'viewer') => ({ id, companies: companyId ? [{ companyId, role }] : [] });
const request = (body = {}) => ({ json: async () => body });
const context = { params: Promise.resolve({ id: 'source' }) };
const now = new Date();

test('platform admin guard rejects unauthenticated access', async () => {
  await assert.rejects(handler('lib/platform-admin.ts', null, {}, false).requirePlatformAdmin(), /REDIRECT:\/auth-test/);
});
test('platform admin guard rejects a regular company owner', async () => {
  await assert.rejects(handler('lib/platform-admin.ts', { ...viewer(), platformRole: 'USER' }).requirePlatformAdmin(), /REDIRECT:\/platform\/dashboard/);
});
test('platform admin guard accepts a platform administrator', async () => {
  const admin = { ...viewer(), platformRole: 'PLATFORM_ADMIN' };
  assert.equal((await handler('lib/platform-admin.ts', admin).requirePlatformAdmin()).id, admin.id);
});

for (const [name, file, model, body] of [
  ['marketplace', 'app/api/listings/[id]/award/route.ts', 'listing', { bidId: 'bid' }],
  ['tender', 'app/api/tenders/[id]/award/route.ts', 'tender', { responseId: 'response' }],
  ['spot', 'app/api/spot-requirements/[id]/award/route.ts', 'spotRequirement', { offerId: 'offer' }],
]) {
  test(`${name} award rejects unauthenticated requests before database access`, async () => {
    assert.equal((await handler(file, null, {}, false).POST(request(body), context)).status, 401);
  });
  test(`${name} award rejects another company before writing`, async () => {
    const route = handler(file, viewer(), { [model]: { findUnique: async () => ({ id: 'source', companyId: 'company-a' }) } });
    assert.equal((await route.POST(request(body), context)).status, 403);
  });
  test(`${name} award rejects a staff member before reading the source`, async () => {
    assert.equal((await handler(file, viewer('company-a', 'STAFF')).POST(request(body), context)).status, 403);
  });
}

test('private job detail rejects a company outside both counterparties', async () => {
  const route = handler('app/api/jobs/[id]/route.ts', viewer('outsider'), { job: { findUnique: async () => ({ buyerCompanyId: 'buyer', providerCompanyId: 'provider', amount: 12345, events: [{ note: 'private completion details' }] }) } });
  const response = await route.GET(request(), context);
  assert.equal(response.status, 403);
  assert.equal(JSON.stringify(response.body).includes('private completion details'), false);
});

for (const [status, next] of [['AWARDED', 'ACCEPTED'], ['ACCEPTED', 'IN_PROGRESS'], ['IN_PROGRESS', 'DELIVERED'], ['DELIVERED', 'COMPLETED']]) {
  test(`unrelated company cannot move a job from ${status} to ${next}`, async () => {
    const route = handler('app/api/jobs/[id]/status/route.ts', viewer('outsider'), { job: { findUnique: async () => ({ status, buyerCompanyId: 'buyer', providerCompanyId: 'provider' }) } });
    assert.equal((await route.POST(request({ status: next, note: 'test completion' }), context)).status, 403);
  });
  const wrongSide = next === 'DELIVERED' ? 'provider' : 'buyer';
  test(`wrong counterparty cannot perform ${next}`, async () => {
    const route = handler('app/api/jobs/[id]/status/route.ts', viewer(wrongSide), { job: { findUnique: async () => ({ status, buyerCompanyId: 'buyer', providerCompanyId: 'provider' }) } });
    assert.equal((await route.POST(request({ status: next, note: 'test completion' }), context)).status, 403);
  });
}
test('completed job cannot be completed a second time', async () => {
  const route = handler('app/api/jobs/[id]/status/route.ts', viewer('provider'), { job: { findUnique: async () => ({ status: 'COMPLETED', buyerCompanyId: 'buyer', providerCompanyId: 'provider' }) } });
  assert.equal((await route.POST(request({ status: 'COMPLETED' }), context)).status, 409);
});
test('review for an unrelated job is rejected before creating review or notification', async () => {
  const route = handler('app/api/jobs/[id]/reviews/route.ts', viewer('outsider'), { job: { findUnique: async () => ({ status: 'COMPLETED', buyerCompanyId: 'buyer', providerCompanyId: 'provider' }) } });
  assert.equal((await route.POST(request({ rating: 5, comment: 'test' }), context)).status, 403);
});

const bid = (id, amount, companyId) => ({ id, amount, bidderCompanyId: companyId, companyId, serviceDescription: `${id}-service`, leadTime: null, notes: `${id}-notes`, status: 'SUBMITTED', createdAt: now, updatedAt: now, bidderCompany: { id: companyId, name: companyId }, company: { id: companyId, name: companyId } });
const own = bid('own', 250, 'company-b');
const rival = bid('rival-private', 987.65, 'company-c');
for (const [name, file, sourceModel, bidModel, key, ownKey, ownerId] of [
  ['guest auction', 'app/api/guest-auctions/[id]/bids/route.ts', 'guestAuction', 'guestAuctionBid', 'guestAuctionId_bidderCompanyId', 'ownBid', 'guest-owner'],
  ['spot requirement', 'app/api/spot-requirements/[id]/offers/route.ts', 'spotRequirement', 'spotOffer', 'spotRequirementId_companyId', 'ownOffer', 'viewer'],
]) {
  const source = { id: 'source', companyId: 'company-a', createdByUserId: ownerId, status: 'OPEN', awardedBidId: null, awardedOfferId: null };
  const models = {
    guestAuction: { count: async () => 0 },
    [sourceModel]: { findUnique: async () => source, count: async () => 0 },
    [bidModel]: {
      findUnique: async ({ where }) => {
        const scope = where[key];
        assert.equal(scope.guestAuctionId ?? scope.spotRequirementId, 'source');
        assert.equal(scope.bidderCompanyId ?? scope.companyId, 'company-b');
        return own;
      },
      findMany: async () => [own, rival],
    },
    review: { findMany: async () => [{ rating: 4 }] },
    guestAuctionReview: { findMany: async () => [] },
    job: { count: async () => 1 },
  };
  test(`${name} bidder sees only their own sealed price and notes`, async () => {
    const response = await handler(file, viewer('company-b', 'OWNER', 'bidder'), models).GET(request(), context);
    assert.equal(response.status, 200);
    assert.equal(response.body.privacy, 'SEALED');
    assert.equal(response.body[ownKey].amount, 250);
    const serialized = JSON.stringify(response.body);
    for (const secret of ['987.65', 'rival-private', 'company-c']) assert.equal(serialized.includes(secret), false);
  });
  test(`${name} poster can compare both bids and provider reviews`, async () => {
    const response = await handler(file, viewer('company-a', 'OWNER', ownerId), models).GET(request(), context);
    assert.equal(response.body.privacy, 'OWNER_CAN_COMPARE_ALL');
    const rows = response.body.bids ?? response.body.offers;
    assert.equal(rows.length, 2);
    assert.equal(rows[1].amount, 987.65);
    assert.equal(rows[1].company.ratingAverage, 4);
  });
  test(`${name} unrelated guest has no access to private bids`, async () => {
    assert.equal((await handler(file, viewer(null, 'OWNER', 'other-guest'), models).GET(request(), context)).status, 403);
  });
}

test('losing spot bidder receives no job link or competing offer identifier', async () => {
  const route = handler('app/api/spot-requirements/[id]/route.ts', viewer('company-b'), {
    spotRequirement: { findUnique: async () => ({ id: 'source', companyId: 'company-a', requiredFrom: now, createdAt: now, updatedAt: now, _count: { offers: 2 }, awardedOfferId: 'rival-private', job: { id: 'private-job' } }) },
    spotOffer: { findUnique: async () => own },
  });
  const response = await route.GET(request(), context);
  assert.equal(response.body.requirement.job, null);
  assert.equal('awardedOfferId' in response.body.requirement, false);
  assert.equal('offerCount' in response.body.requirement, false);
  assert.equal(JSON.stringify(response.body).includes('rival-private'), false);
});

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => key === 'OR' ? value.some(part => matches(row, part)) : row[key] === value);
}
const notifications = [
  { id: 'own-company', companyId: 'company-b', recipientUserId: null },
  { id: 'own-personal', companyId: null, recipientUserId: 'viewer' },
  { id: 'other-company', companyId: 'company-c', recipientUserId: null },
  { id: 'other-person', companyId: 'company-b', recipientUserId: 'someone-else' },
].map(row => ({ ...row, createdAt: now, title: row.id, message: row.id }));
const notificationModels = {
  notification: {
    findMany: async ({ where }) => notifications.filter(row => matches(row, where)),
    findFirst: async ({ where }) => notifications.find(row => matches(row, where)) ?? null,
  },
  $queryRaw: async (strings, userId) => { assert.equal(userId, 'viewer'); return []; },
};
test('notification list excludes other companies and another individual recipient', async () => {
  const response = await handler('app/api/notifications/route.ts', viewer(), notificationModels).GET();
  assert.deepEqual(response.body.notifications.map(row => row.id), ['own-company', 'own-personal']);
  assert.equal(response.body.unreadCount, 2);
});
for (const id of ['other-company', 'other-person']) {
  test(`cannot mark ${id} notification read`, async () => {
    assert.equal((await handler('app/api/notifications/route.ts', viewer(), notificationModels).PATCH(request({ id }))).status, 404);
  });
}
