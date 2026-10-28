import test from 'node:test';
import assert from 'node:assert/strict';
import { totp } from './uat-totp.cjs';
test('TOTP uses RFC 6238 SHA-1 reference vectors',()=>{
  const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  for(const [seconds,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037']])assert.equal(totp(secret,seconds*1000,8),expected);
  assert.equal(totp(secret,59000),'287082');
});
test('TOTP rejects malformed fixture secrets and counters',()=>{
  assert.throws(()=>totp('not a secret'));assert.throws(()=>totp('ABC2',-1));
});
