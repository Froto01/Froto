import test from 'node:test';
import assert from 'node:assert/strict';
import { checkUatEnvironment, UAT_DATABASE_HOST } from './uat-safety.cjs';

const safe = { DATABASE_URL: `postgresql://fixture:fixture@${UAT_DATABASE_HOST}/froto_automated_uat`, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_fixture', CLERK_SECRET_KEY: 'sk_test_fixture', UAT_BASE_URL: 'http://localhost:3100' };
test('UAT preflight accepts only the pinned isolated database and development authentication', () => {
  assert.deepEqual(checkUatEnvironment(safe), []);
  assert.ok(checkUatEnvironment({ ...safe, DATABASE_URL: 'postgresql://fixture:fixture@production.example/froto_automated_uat' }).some(e => e.includes('dedicated')));
  assert.ok(checkUatEnvironment({ ...safe, DATABASE_URL: safe.DATABASE_URL.replace('/froto_automated_uat', '/other') }).some(e => e.includes('dedicated')));
  assert.ok(checkUatEnvironment({ ...safe, CLERK_SECRET_KEY: 'sk_live_fixture' }).some(e => e.includes('development')));
  assert.ok(checkUatEnvironment({ ...safe, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_fixture' }).some(e => e.includes('development')));
});
test('missing credentials, active outbound email and remote application targets block UAT', () => {
  assert.equal(checkUatEnvironment({}).length, 3);
  for (const key of ['CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) {
    assert.ok(checkUatEnvironment({ ...safe, [key]: `${safe[key]}…` }).some(e => e.includes('full copied')));
    assert.ok(checkUatEnvironment({ ...safe, [key]: `${safe[key]}...` }).some(e => e.includes('full copied')));
  }
  assert.ok(checkUatEnvironment({ ...safe, RESEND_API_KEY: 'fixture' }).some(e => e.includes('email')));
  assert.ok(checkUatEnvironment({ ...safe, UAT_BASE_URL: 'https://production.example' }).some(e => e.includes('isolated application')));
});
