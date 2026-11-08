import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const branch = 'security/uat-target-hardening-20261109';

test('publication configuration disables only this draft branch', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.deepEqual(config, {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    git: { deploymentEnabled: { [branch]: false } },
  });
});

test('draft CI is branch-scoped, reads exact head and does not request credentials or deployment', () => {
  const workflow = read('.github/workflows/uat-target-guard-checks.yml');
  assert.ok(workflow.includes(`branches: [${branch}]`));
  assert.ok(workflow.includes("github.head_ref == 'security/uat-target-hardening-20261109'"));
  assert.ok(workflow.includes('ref: ${{ github.event.pull_request.head.sha || github.sha }}'));
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /secrets\.|environment:|pull_request_target|workflow_run|:\s*write\b|npm run uat\b|prisma migrate|vercel deploy/);
});

test('credential-bearing browser UAT is not triggered by this draft branch', () => {
  const workflow = read('.github/workflows/uat.yml');
  assert.match(workflow, /branches: \[spot-requirements, automated-uat\]/);
  assert.ok(!workflow.includes(branch));
  assert.match(workflow, /environment: froto-uat/);
});
