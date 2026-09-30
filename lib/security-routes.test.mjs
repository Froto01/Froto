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
    $transaction: models.$transaction ?? (async (fn) => fn(prisma)),
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
    if (name === '@/lib/fee-snapshots') return { createJobFeeSnapshotIfApplicable: models.feeSnapshot ?? fail('create fee') };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function('require', 'module', 'exports', code)(require, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const viewer = (companyId = 'company-b', role = 'OWNER', id = 'viewer') => ({ id, companies: companyId ? [{ companyId, role }] : [] });
const request = (body = {}) => ({ json: async () => body });
const context = { params: Promise.resolve({ id: 'source' }) };
const now = new Date();

const spotOfferFile = 'app/api/spot-requirements/[id]/offers/route.ts';
const openSpot = { id: 'source', companyId: 'company-a', status: 'OPEN', offersCloseAt: null, awardedOfferId: null };
for (const [name, file, model, body, awardedKey] of [
  ['marketplace', 'app/api/listings/[id]/award/route.ts', 'listing', { bidId: 'bid' }, 'awardedBidId'],
  ['tender', 'app/api/tenders/[id]/award/route.ts', 'tender', { responseId: 'response' }, 'awardedResponseId'],
  ['spot', 'app/api/spot-requirements/[id]/award/route.ts', 'spotRequirement', { offerId: 'offer', closeEarly: true }, 'awardedOfferId'],
]) {
  test(`${name} award maps serialization conflict to HTTP 409`, async () => {
    const route = handler(file, viewer('company-a'), {
      $transaction: async (_fn, options) => {
        assert.equal(options.isolationLevel, 'Serializable');
        throw Object.assign(new Error('Serialization conflict'), { code: 'P2034' });
      },
    });
    assert.equal((await route.POST(request(body), context)).status, 409);
  });
  test(`${name} repeat award is rejected before any write`, async () => {
    const route = handler(file, viewer('company-a'), { [model]: {
      findUnique: async () => ({ id: 'source', companyId: 'company-a', status: 'AWARDED', [awardedKey]: 'winner' }),
    } });
    assert.equal((await route.POST(request(body), context)).status, 409);
  });
  test(`${name} award leaves unexpected database errors observable`, async () => {
    const error = new Error('Unexpected database failure');
    const route = handler(file, viewer('company-a'), { $transaction: async () => { throw error; } });
    await assert.rejects(route.POST(request(body), context), candidate => candidate === error);
  });
}
for (const [name, file, model, bidModel, body, source, offer] of [
  ['spot', 'app/api/spot-requirements/[id]/award/route.ts', 'spotRequirement', 'spotOffer', { offerId: 'offer', closeEarly: true }, openSpot, { id: 'offer', companyId: 'company-b', status: 'SUBMITTED', amount: 250, company: { name: 'Provider' } }],
  ['marketplace', 'app/api/listings/[id]/award/route.ts', 'listing', 'bid', { bidId: 'bid' }, { id: 'source', companyId: 'company-a', status: 'ACTIVE', awardedBidId: null, biddingClosesAt: new Date(0) }, { id: 'bid', listingId: 'source', bidderCompanyId: 'company-b', amount: 250, bidderCompany: { name: 'Provider' } }],
]) {
  test(`${name} lost conditional award claim stops before job or notifications`, async () => {
    const route = handler(file, viewer('company-a'), {
      [model]: {
        findUnique: async () => source,
        updateMany: async ({ where }) => {
          assert.equal(where.id, 'source');
          assert.equal(where.status, source.status);
          assert.equal(where[name === 'spot' ? 'awardedOfferId' : 'awardedBidId'], null);
          return { count: 0 };
        },
      },
      [bidModel]: { findFirst: async () => offer, findUnique: async () => offer, findMany: async () => [] },
    });
    assert.equal((await route.POST(request(body), context)).status, 409);
  });
  test(`${name} successful award creates one job and rejects its repeat`, async () => {
    const state = { ...source };
    const jobs = [];
    const fees = [];
    const notifications = [];
    const route = handler(file, viewer('company-a'), {
      [model]: {
        findUnique: async () => state,
        updateMany: async ({ where, data }) => {
          assert.equal(where.id, state.id);
          assert.equal(where.status, state.status);
          Object.assign(state, data);
          return { count: 1 };
        },
      },
      [bidModel]: {
        findFirst: async () => offer, findUnique: async () => offer, findMany: async () => [],
        updateMany: async () => ({ count: 1 }),
        update: async () => offer,
      },
      job: { create: async ({ data }) => { jobs.push(data); return { id: 'new-job', ...data }; } },
      feeSnapshot: async (data) => { fees.push(data); },
      notification: { create: async ({ data }) => { notifications.push(data); return data; } },
    });
    const response = await route.POST(request(body), context);
    assert.equal(response.status, 200);
    assert.equal(response.body.jobId, 'new-job');
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].amount, 250);
    assert.equal(jobs[0].events.create.eventType, 'AWARDED');
    assert.equal(fees.length, 1);
    assert.ok(notifications.length > 0);
    assert.equal((await route.POST(request(body), context)).status, 409);
    assert.equal(jobs.length, 1);
    assert.equal(fees.length, 1);
  });
}
function listingBidRoute(overrides = {}) {
  const writes = [];
  const bidder = viewer();
  bidder.companies[0].company = { name: 'Test bidder', verified: false };
  const route = handler('app/api/listings/[id]/bids/route.ts', bidder, {
    listing: { findUnique: async () => ({ id: 'source', title: 'Test listing', companyId: 'company-a', status: 'ACTIVE', awardedBidId: null, biddingClosesAt: null, startingBid: 0, minimumBidIncrement: 0.01, ...overrides }) },
    bid: {
      findFirst: async () => null,
      create: async ({ data }) => { writes.push(data); return { ...data, id: 'bid', createdAt: now }; },
    },
    notification: { create: async () => ({}) },
  });
  return { route, writes };
}
for (const amount of [19.99, 0.29]) {
  test(`marketplace bid accepts valid cents ${amount}`, async () => {
    const { route, writes } = listingBidRoute();
    assert.equal((await route.POST(request({ amount }), context)).status, 201);
    assert.equal(writes[0].amount, amount);
    assert.equal(writes[0].bidderCompanyId, 'company-b');
  });
}
for (const [name, overrides, amount, status] of [
  ['excess precision', {}, 19.999, 400],
  ['closed window', { biddingClosesAt: new Date(0) }, 250, 409],
  ['own company', { companyId: 'company-b' }, 250, 400],
  ['below minimum', { startingBid: 500 }, 250, 400],
]) {
  test(`marketplace bid rejects ${name} without writing`, async () => {
    const { route, writes } = listingBidRoute(overrides);
    assert.equal((await route.POST(request({ amount }), context)).status, status);
    assert.equal(writes.length, 0);
  });
}
for (const method of ['POST', 'PATCH']) {
  test(`spot offer ${method} rejects an unsigned user before database access`, async () => {
    assert.equal((await handler(spotOfferFile, null, {}, false)[method](request({ amount: 250 }), context)).status, 401);
  });
  test(`spot offer ${method} rejects the requirement owner before writes`, async () => {
    const route = handler(spotOfferFile, viewer('company-a'), { spotRequirement: { findUnique: async () => openSpot } });
    assert.equal((await route[method](request({ amount: 250 }), context)).status, 403);
  });
  for (const [state, requirement] of [
    ['expired', { ...openSpot, offersCloseAt: new Date(0) }],
    ['closed', { ...openSpot, status: 'CLOSED' }],
    ['awarded', { ...openSpot, awardedOfferId: 'winner' }],
  ]) {
    test(`spot offer ${method} rejects an ${state} requirement before writes`, async () => {
      const route = handler(spotOfferFile, viewer(), { spotRequirement: { findUnique: async () => requirement } });
      assert.equal((await route[method](request({ amount: 250 }), context)).status, 409);
    });
  }
}
test('spot revision cannot select a rival offer by supplied identifier', async () => {
  const route = handler(spotOfferFile, viewer(), {
    spotRequirement: { findUnique: async () => openSpot },
    spotOffer: { findUnique: async ({ where }) => {
      assert.deepEqual(where, { spotRequirementId_companyId: { spotRequirementId: 'source', companyId: 'company-b' } });
      return null;
    } },
  });
  assert.equal((await route.PATCH(request({ offerId: 'rival-private', amount: 1 }), context)).status, 404);
});
function writableSpot() {
  const writes = [];
  const route = handler(spotOfferFile, viewer(), {
    spotRequirement: { findUnique: async () => openSpot },
    spotOffer: {
      findUnique: async ({ where }) => {
        assert.equal(where.spotRequirementId_companyId.companyId, 'company-b');
        return { id: 'own-offer', status: 'SUBMITTED' };
      },
      create: async ({ data }) => { writes.push(data); return { ...data, id: 'own-offer', status: 'SUBMITTED', createdAt: now }; },
      update: async ({ where, data }) => {
        assert.deepEqual(where, { id: 'own-offer' });
        writes.push(data);
        return { ...data, id: 'own-offer', status: 'SUBMITTED', updatedAt: now };
      },
    },
    notification: { create: async () => ({}) },
  });
  return { route, writes };
}
for (const method of ['POST', 'PATCH']) {
  for (const amount of [19.99, 0.29, 250, 987.65]) {
    test(`spot offer ${method} accepts valid cents ${amount}`, async () => {
      const { route, writes } = writableSpot();
      const response = await route[method](request({ amount, offerId: 'rival-private' }), context);
      assert.equal(response.status, method === 'POST' ? 201 : 200);
      assert.equal(writes.length, 1);
      assert.equal(writes[0].amount, amount);
      assert.equal(writes[0].submittedByUserId, 'viewer');
      if (method === 'POST') assert.equal(writes[0].companyId, 'company-b');
    });
  }
  for (const amount of [0, -1, 19.999, 'not-a-number']) {
    test(`spot offer ${method} rejects invalid amount ${amount} without writing`, async () => {
      const { route, writes } = writableSpot();
      assert.equal((await route[method](request({ amount }), context)).status, 400);
      assert.equal(writes.length, 0);
    });
  }
}

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
