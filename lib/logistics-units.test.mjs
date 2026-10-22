import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function compile(path, imports = {}) {
  const compiledModule = { exports: {} };
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const units = compile('lib/logistics-units.ts');

test('units retain existing reporting keys and include slots and tonnes', () => {
  assert.deepEqual(units.LOGISTICS_UNITS.map(unit => unit.value), ['pallets', 'parcels', 'slots', 'tonnes', 'sqm', 'cbm']);
  for (const invalid of ['palets', 'Pallets', 'pallet', 'parcel', 'slot', 'm2', '', null, {}]) assert.equal(units.isLogisticsUnit(invalid), false);
});

test('actual requirement POST rejects mistyped units before persistence and saves canonical selections', async () => {
  let writes = 0;
  let savedUnit;
  const route = compile('app/api/spot-requirements/route.ts', {
    '@/lib/logistics-units': units,
    '@clerk/nextjs/server': { auth: async () => ({ userId: 'test-session' }) },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/opportunity-alerts': { notifyMatchingOpportunity: async () => {} },
    '@/lib/prisma': { prisma: {
      user: { findUnique: async () => ({ id: 'test-user', companies: [{ companyId: 'test-company' }] }) },
      spotRequirement: { create: async ({ data }) => { writes++; savedUnit = data.quantityUnit; return { ...data, id: 'test-requirement', status: 'OPEN', createdAt: new Date('2026-10-23T00:00:00Z') }; } },
    } },
  });
  const base = { requirementType: 'TRANSPORT', title: 'Simulated unit regression', origin: 'Brisbane', destination: 'Gold Coast', quantity: 2, requiredFrom: '2026-12-01T00:00:00Z' };
  for (const quantityUnit of ['palets', 'Pallets', 'slot']) {
    const response = await route.POST({ json: async () => ({ ...base, quantityUnit }) });
    assert.equal(response.status, 400);
  }
  assert.equal(writes, 0);
  for (const unit of units.LOGISTICS_UNITS) {
    const response = await route.POST({ json: async () => ({ ...base, quantityUnit: unit.value }) });
    assert.equal(response.status, 201);
    assert.equal(savedUnit, unit.value);
  }
  assert.equal(writes, units.LOGISTICS_UNITS.length);
});
