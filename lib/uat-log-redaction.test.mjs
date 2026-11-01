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
