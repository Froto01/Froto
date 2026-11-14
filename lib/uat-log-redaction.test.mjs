import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLineRedactor, redactUatLine } from './uat-log-redaction.mjs';
test('masks development auth URLs without printing token fragments', () => {
  const output = [];
  const guard = createLineRedactor(s => output.push(s));
  guard.push('Clerk failed at https://localhost:3100/?__clerk_db_');
  guard.push('jwt=example-sensitive-token\n');
  guard.push('ordinary failure: HTTP 401\n');
  guard.flush();
  assert.equal(output.join(''), '[UAT output redacted: authentication credential or URL]\nordinary failure: HTTP 401\n');
});
test('masks bearer and encoded auth URL parameters', () => {
  assert.match(redactUatLine('Authorization: Bearer sample'), /redacted/);
  assert.match(redactUatLine('/?__clerk_db_jwt%3Dsample'), /redacted/);
  assert.equal(redactUatLine('132 tests passed'), '132 tests passed');
});

test('masks cookie, basic authentication, API key and connection URL log lines', () => {
  for (const fixture of [
    'Set-Cookie: __session=synthetic-cookie; HttpOnly',
    'Cookie: __session=synthetic-cookie',
    'Authorization: Basic synthetic-auth-header',
    'Proxy-Authorization: Bearer synthetic-auth-header',
    'X-Api-Key: synthetic-api-key',
    'DATABASE_URL=postgresql://synthetic-user:synthetic-password@db.example.test/private',
    'DIRECT_URL=synthetic-connection-string',
    'debug: postgres://synthetic-user:synthetic-password@db.example.test/private',
    'UAT_CLERK_SECRET_KEY=synthetic-key',
    'RESEND_API_KEY=synthetic-key',
    'invalid test key sk_live_synthetic-key',
    'https://localhost/?refresh_token=synthetic-token',
    'https://localhost/?token%3Dsynthetic-token',
  ]) {
    assert.equal(redactUatLine(fixture), '[UAT output redacted: authentication credential or URL]', fixture);
  }
});
test('keeps ordinary diagnostics and job totals visible', () => {
  for (const line of ['HTTP 401', '5 tests passed', 'Error: database connection timeout', 'npm test: 128 passed', 'compilation failed: TypeScript']) {
    assert.equal(redactUatLine(line), line);
  }
});
test('buffers split secret-bearing cookie and connection lines without leaking fragments', () => {
  const out = [];
  const guard = createLineRedactor(s => out.push(s));
  for (const chunk of ['trace Set-Coo', 'kie: __sess', 'ion=synthetic-123', '\n', 'database=', 'postgresql://', 'synthetic:synthetic@db.example.test/test', '\n', 'ordinary status: 403', '\n']) guard.push(chunk);
  guard.flush();
  assert.equal(out.join(''), '[UAT output redacted: authentication credential or URL]\n[UAT output redacted: authentication credential or URL]\nordinary status: 403\n');
});
test('redacts unfinished secret-bearing final line on flush', () => {
  const out = [];
  const guard = createLineRedactor(s => out.push(s));
  guard.push('Cookie: __session=synthetic-tail');
  guard.flush();
  assert.equal(out.join(''), '[UAT output redacted: authentication credential or URL]');
});
