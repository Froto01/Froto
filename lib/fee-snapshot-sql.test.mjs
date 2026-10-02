import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { calculateTransactionFee } from './fee-engine.mjs';

const require = createRequire(import.meta.url);
const cache = new Map();
function loadGenerated(file) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const compiledModule = { exports: {} };
  cache.set(file, compiledModule);
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(file).href));
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = name => name.startsWith('.') ? loadGenerated(resolve(dirname(file), `${name}.ts`)) : require(name);
  new Function('require', 'module', 'exports', compiled)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test('actual snapshot helper compiles to INSERT ON CONFLICT DO NOTHING with no existing-row update', async () => {
  const { PrismaClient } = loadGenerated(fileURLToPath(new URL('./generated/prisma/client.ts', import.meta.url)));
  const queries = [];
  const adapter = {
    provider: 'postgres', adapterName: 'fee-sql-regression',
    queryRaw: async query => {
      queries.push(query.sql);
      return { columnTypes: [7], columnNames: ['id'], rows: [['saved-fee']] };
    },
    executeRaw: async query => { queries.push(query.sql); return 1; },
    getConnectionInfo: () => ({ schemaName: 'public', supportsRelationJoins: true }),
    dispose: async () => {},
    startTransaction: async () => ({ ...adapter, options: { usePhantomQuery: true }, commit: async () => {}, rollback: async () => {} }),
  };
  const client = new PrismaClient({ adapter: { provider: 'postgres', adapterName: adapter.adapterName, connect: async () => adapter } });
  const compiledModule = { exports: {} };
  const source = readFileSync(new URL('./fee-snapshots.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.equal(name, '@/lib/fee-engine.mjs');
    return { calculateTransactionFee };
  }, compiledModule, compiledModule.exports);
  try {
    const result = await compiledModule.exports.createJobFeeSnapshotIfApplicable({
      tx: {
        feeRule: { findMany: async () => [{ id: 'rule', code: 'UAT', version: 1, payerType: 'PROVIDER', percentageBps: 300, gstBps: 1000, minimumFee: null, maximumFee: null }] },
        transactionFee: {
          createMany: args => client.transactionFee.createMany(args),
          findUniqueOrThrow: args => client.transactionFee.findUniqueOrThrow({ ...args, select: { id: true } }),
        },
      },
      transactionType: 'MARKETPLACE_JOB', sourceId: 'sql-regression', transactionAmount: '500.00', buyerCompanyId: 'buyer', providerCompanyId: 'provider', calculatedAt: new Date('2026-10-02T00:00:00Z'),
    });
    assert.equal(result.id, 'saved-fee');
    assert.equal(queries.length, 2);
    assert.match(queries[0], /^INSERT INTO .*"TransactionFee"/);
    assert.match(queries[0], /ON CONFLICT DO NOTHING/);
    assert.match(queries[1], /^SELECT /);
    assert.ok(queries.every(sql => !/DO UPDATE|^UPDATE /.test(sql)));
  } finally { await client.$disconnect(); }
});
