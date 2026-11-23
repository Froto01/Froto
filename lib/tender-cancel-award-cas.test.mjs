import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../app/api/tenders/[id]/cancel/route.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const baseTender = () => ({
  id: 'tender-1', companyId: 'company-owner', status: 'OPEN', awardedResponseId: null,
});

function setup({
  signedIn = true, foundUser = true, companyId = 'company-owner', role = 'OWNER',
  tender = baseTender(), claimCount = 1, transactionError = null, writeError = null,
} = {}) {
  const calls = [];
  const tx = {
    tender: {
      findUnique: async ({ where }) => {
        calls.push('read'); assert.deepEqual(where, { id: 'tender-1' }); return tender;
      },
      updateMany: async ({ where, data }) => {
        calls.push('claim');
        assert.deepEqual(where, {
          id: 'tender-1', companyId: 'company-owner',
          status: tender.status, awardedResponseId: null,
        });
        assert.deepEqual(data, { status: 'CANCELLED' });
        if (writeError) throw writeError;
        return { count: claimCount };
      },
      update: async () => { throw Error('unsafe unscoped write'); },
    },
  };
  const prisma = {
    user: { findUnique: async ({ where }) => {
      calls.push('user');
      assert.deepEqual(where, { clerkId: 'fixture-clerk' });
      return foundUser ? { companies: companyId ? [{ companyId, role }] : [] } : null;
    } },
    $transaction: async (fn, options) => {
      calls.push('transaction');
      assert.equal(options.isolationLevel, 'Serializable');
      if (transactionError) throw transactionError;
      return fn(tx);
    },
  };
  const module = { exports: {} };
  const safeRequire = (name) => {
    if (name === '@clerk/nextjs/server') {
      return { auth: async () => ({ userId: signedIn ? 'fixture-clerk' : null }) };
    }
    if (name === 'next/server') {
      return { NextResponse: { json: (body, opts = {}) => ({ status: opts.status ?? 200, body }) } };
    }
    if (name === '@/lib/prisma') return { prisma };
    throw Error('Unexpected import ' + name);
  };
  new Function('require', 'module', 'exports', transpiled)(safeRequire, module, module.exports);
  return {
    calls,
    cancel: () => module.exports.POST({}, { params: Promise.resolve({ id: 'tender-1' }) }),
  };
}

test('signed-out request never accesses user or tender', async () => {
  const x = setup({ signedIn: false });
  assert.equal((await x.cancel()).status, 401);
  assert.deepEqual(x.calls, []);
});
test('unregistered user is rejected before transaction', async () => {
  const x = setup({ foundUser: false });
  assert.equal((await x.cancel()).status, 409);
  assert.deepEqual(x.calls, ['user']);
});
test('user without membership is rejected', async () => {
  const x = setup({ companyId: null });
  assert.equal((await x.cancel()).status, 403);
  assert.deepEqual(x.calls, ['user']);
});
for (const role of ['STAFF', 'DISPATCHER']) {
  test(role + ' cannot cancel tender', async () => {
    const x = setup({ role });
    assert.equal((await x.cancel()).status, 403);
    assert.deepEqual(x.calls, ['user']);
  });
}
test('other company cannot cancel or claim an owner tender', async () => {
  const x = setup({ tender: { ...baseTender(), companyId: 'rival-company' } });
  assert.equal((await x.cancel()).status, 403);
  assert.deepEqual(x.calls, ['user', 'transaction', 'read']);
});
test('missing tender returns 404 with no write', async () => {
  const x = setup({ tender: null });
  assert.equal((await x.cancel()).status, 404);
  assert.deepEqual(x.calls, ['user', 'transaction', 'read']);
});
test('awarded tender status cannot be cancelled', async () => {
  const x = setup({ tender: { ...baseTender(), status: 'AWARDED' } });
  assert.equal((await x.cancel()).status, 409);
  assert.deepEqual(x.calls, ['user', 'transaction', 'read']);
});
test('awarded response marker cannot be cancelled', async () => {
  const x = setup({ tender: { ...baseTender(), awardedResponseId: 'winner-1' } });
  assert.equal((await x.cancel()).status, 409);
  assert.deepEqual(x.calls, ['user', 'transaction', 'read']);
});
test('already cancelled remains an idempotent success', async () => {
  const x = setup({ tender: { ...baseTender(), status: 'CANCELLED' } });
  const response = await x.cancel();
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'CANCELLED');
  assert.deepEqual(x.calls, ['user', 'transaction', 'read']);
});
for (const status of ['OPEN', 'CLOSED']) {
  test(status + ' cancellation claims exact company/status/unawarded guard', async () => {
    const x = setup({ tender: { ...baseTender(), status } });
    const response = await x.cancel();
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, tenderId: 'tender-1', status: 'CANCELLED' });
    assert.deepEqual(x.calls, ['user', 'transaction', 'read', 'claim']);
  });
}
test('competing award/status change defeats claim with 409, not 200', async () => {
  const x = setup({ claimCount: 0 });
  const response = await x.cancel();
  assert.equal(response.status, 409);
  assert.match(response.body.error, /changed/);
  assert.deepEqual(x.calls, ['user', 'transaction', 'read', 'claim']);
});
test('serializable write conflict P2034 becomes retryable 409', async () => {
  const x = setup({ writeError: Object.assign(Error('internal driver details'), { code: 'P2034' }) });
  const response = await x.cancel();
  assert.equal(response.status, 409);
  assert.equal(JSON.stringify(response.body).includes('internal driver details'), false);
});
test('serializable transaction conflict P2034 becomes 409', async () => {
  const x = setup({ transactionError: Object.assign(Error('driver details'), { code: 'P2034' }) });
  assert.equal((await x.cancel()).status, 409);
});
test('unexpected database failures do not report success or leak details', async () => {
  const x = setup({ writeError: Error('private connection details') });
  const response = await x.cancel();
  assert.equal(response.status, 500);
  assert.equal(JSON.stringify(response.body).includes('private connection details'), false);
});
