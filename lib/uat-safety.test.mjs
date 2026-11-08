import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkUatEnvironment, UAT_DATABASE_HOST, UAT_APP_ORIGIN } from './uat-safety.cjs';

const safe = { DATABASE_URL: `postgresql://fixture:fixture@${UAT_DATABASE_HOST}/froto_automated_uat`, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_fixture', CLERK_SECRET_KEY: 'sk_test_fixture', UAT_BASE_URL: UAT_APP_ORIGIN };
test('UAT preflight accepts only the pinned isolated database and development authentication', () => {
  assert.deepEqual(checkUatEnvironment(safe), []);
  assert.ok(checkUatEnvironment({ ...safe, DATABASE_URL: 'postgresql://fixture:fixture@production.example/froto_automated_uat' }).some(e => e.includes('dedicated')));
  assert.ok(checkUatEnvironment({ ...safe, DATABASE_URL: safe.DATABASE_URL.replace('/froto_automated_uat', '/other') }).some(e => e.includes('dedicated')));
  assert.ok(checkUatEnvironment({ ...safe, CLERK_SECRET_KEY: 'sk_live_fixture' }).some(e => e.includes('development')));
  assert.ok(checkUatEnvironment({ ...safe, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_fixture' }).some(e => e.includes('development')));
});

test('optional DIRECT_URL accepts only the same pinned direct or pooled UAT target', () => {
  assert.deepEqual(checkUatEnvironment(safe), []);
  for (const host of [UAT_DATABASE_HOST, UAT_DATABASE_HOST.replace('-pooler.', '.')]) {
    for (const protocol of ['postgres', 'postgresql']) {
      const value = `${protocol}://fixture:fixture@${host}:5432/froto_automated_uat?sslmode=require&channel_binding=require&connect_timeout=10`;
      assert.deepEqual(checkUatEnvironment({ ...safe, DATABASE_URL: value, DIRECT_URL: value }), []);
    }
  }
  assert.deepEqual(checkUatEnvironment({ ...safe, DIRECT_URL: safe.DATABASE_URL.replace('-pooler.', '.') }), []);
});

const invalidTargets = [
  ['production-like host', 'postgresql://fixture:fixture@production.example/froto_automated_uat'],
  ['other database', safe.DATABASE_URL.replace('/froto_automated_uat', '/production')],
  ['other port', safe.DATABASE_URL.replace('/froto_', ':5433/froto_')],
  ['wrong protocol', safe.DATABASE_URL.replace('postgresql:', 'https:')],
  ['lookalike host', safe.DATABASE_URL.replace(UAT_DATABASE_HOST, `${UAT_DATABASE_HOST}.example.com`)],
  ['fragment', `${safe.DATABASE_URL}#target`],
  ['invalid URL', 'not-a-connection-string'],
  ['empty value', ''],
  ['whitespace value', '   '],
];
for (const [label, value] of invalidTargets) {
  test(`both UAT URL guards reject ${label}`, () => {
    for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
      const errors = checkUatEnvironment({ ...safe, [key]: value });
      assert.ok(errors.some(error => error.includes(key)), `${key} should be rejected`);
    }
  });
}

for (const query of [
  'host=production.example', 'hostaddr=192.0.2.1', 'database=production',
  'dbname=production', 'port=5433', 'user=another-user', 'password=synthetic-override',
  'options=-csearch_path%3Dproduction', 'schema=other', 'sslmode=disable',
  'sslmode=require&sslmode=disable', 'sslmode=require&sslmode=require',
  'SSLMode=require', 'channel_binding=disable', 'connect_timeout=0',
  'connect_timeout=-1', 'connect_timeout=1.5', '%68ost=production.example',
  '__proto__=value', 'constructor=value',
]) {
  test(`both UAT URL guards reject unsupported options: ${query.split('=')[0]}`, () => {
    for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
      assert.ok(checkUatEnvironment({ ...safe, [key]: `${safe.DATABASE_URL}?${query}` })
        .some(error => error === `${key} contains unsupported connection options`));
    }
  });
}

test('database rejection messages never expose URL, username, password or parameter values', () => {
  const value = 'postgresql://synthetic-user:synthetic-password@production.example/private-db?token=synthetic-token';
  const errors = checkUatEnvironment({ ...safe, DATABASE_URL: value, DIRECT_URL: value }).join('\n');
  for (const fragment of ['synthetic-user', 'synthetic-password', 'production.example', 'private-db', 'synthetic-token', value]) {
    assert.equal(errors.includes(fragment), false);
  }
});

test('UAT runner retains preflight before build and browser execution', () => {
  const source = readFileSync(new URL('../scripts/run-uat.mjs', import.meta.url), 'utf8');
  assert.match(source, /\['DATABASE_URL', 'DIRECT_URL',/);
  const preflight = source.indexOf("['node', ['scripts/uat-preflight.mjs']]");
  const build = source.indexOf("['npm', ['run', 'build']]");
  const browser = source.indexOf("['npx', ['playwright', 'test']]");
  assert.ok(preflight >= 0 && preflight < build && build < browser);
  assert.match(source, /if \(code !== 0\) process\.exit\(code\)/);
});

test('actual runner stops at a rejected synthetic preflight before build or browser commands', () => {
  const directory = mkdtempSync(join(tmpdir(), 'froto-uat-preflight-'));
  try {
    for (const path of ['scripts', 'lib', 'bin', 'node_modules/dotenv']) mkdirSync(join(directory, path), { recursive: true });
    for (const path of ['scripts/run-uat.mjs', 'scripts/uat-preflight.mjs', 'lib/uat-safety.cjs', 'lib/uat-log-redaction.mjs']) {
      copyFileSync(new URL(`../${path}`, import.meta.url), join(directory, path));
    }
    // No real env files or packages are loaded. Exercise the unmodified runner
    // and preflight with a no-op dotenv module and explicit dummy values only.
    writeFileSync(join(directory, 'node_modules/dotenv/package.json'), JSON.stringify({
      name: 'dotenv', type: 'module', exports: { '.': './index.js', './config': './index.js' },
    }));
    writeFileSync(join(directory, 'node_modules/dotenv/index.js'), 'export function config() { return {}; }');
    const log = join(directory, 'commands.jsonl');
    for (const command of ['node', 'npm', 'npx']) {
      const path = join(directory, 'bin', command);
      writeFileSync(path, `#!${process.execPath}\n`
        + `const { appendFileSync } = require('node:fs');\n`
        + `appendFileSync(${JSON.stringify(log)}, JSON.stringify([${JSON.stringify(command)}, ...process.argv.slice(2)]) + '\\n');\n`
        + (command === 'node'
          ? `const { spawnSync } = require('node:child_process'); const r = spawnSync(process.execPath, process.argv.slice(2), { env: process.env, stdio: 'inherit' }); process.exit(r.status ?? 1);\n`
          : 'process.exit(0);\n'));
      chmodSync(path, 0o700);
    }
    for (const [direct, expectedStatus] of [
      ['postgresql://fixture:fixture@production.example/froto_automated_uat', 2],
      [`${safe.DATABASE_URL}?host=production.example`, 2],
      [safe.DATABASE_URL.replace('-pooler.', '.'), 0],
    ]) {
      writeFileSync(log, '');
      const result = spawnSync(process.execPath, ['scripts/run-uat.mjs'], {
        cwd: directory, env: { ...safe, DIRECT_URL: direct, PATH: join(directory, 'bin') },
        encoding: 'utf8', timeout: 10000,
      });
      assert.equal(result.status, expectedStatus, result.stderr);
      const commands = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)[0]);
      assert.deepEqual(commands, expectedStatus === 0 ? ['node', 'npm', 'npx'] : ['node']);
      const report = JSON.parse(readFileSync(join(directory, 'uat-results/preflight.json'), 'utf8'));
      assert.equal(report.status, expectedStatus === 0 ? 'READY' : 'BLOCKED');
      assert.equal(`${result.stdout}${result.stderr}${JSON.stringify(report)}`.includes(direct), false);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('missing credentials, active outbound email and remote application targets block UAT', () => {
  assert.equal(checkUatEnvironment({}).length, 3);
  for (const key of ['CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) {
    assert.ok(checkUatEnvironment({ ...safe, [key]: `${safe[key]}…` }).some(e => e.includes('full copied')));
    assert.ok(checkUatEnvironment({ ...safe, [key]: `${safe[key]}...` }).some(e => e.includes('full copied')));
  }
  assert.ok(checkUatEnvironment({ ...safe, RESEND_API_KEY: 'fixture' }).some(e => e.includes('email')));
  for (const origin of ['http://localhost:3100', 'https://127.0.0.1:3100', 'https://localhost:3101']) assert.ok(checkUatEnvironment({ ...safe, UAT_BASE_URL: origin }).some(e => e.includes('isolated application')));
  assert.ok(checkUatEnvironment({ ...safe, UAT_BASE_URL: 'https://production.example' }).some(e => e.includes('isolated application')));
});
