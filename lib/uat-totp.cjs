// CommonJS is shared by Node regression tests and the Playwright transformer.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHmac } = require('node:crypto');
function totp(secret, now = Date.now(), digits = 6) {
  if (!/^[A-Z2-7]+=*$/i.test(secret) || ![6,8].includes(digits) || !Number.isFinite(now) || now < 0) throw new Error('Invalid development TOTP fixture');
  let bits = '';
  for (const char of secret.toUpperCase().replace(/=+$/, '')) bits += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char).toString(2).padStart(5, '0');
  const key = Buffer.from((bits.match(/.{8}/g) || []).map(value => parseInt(value,2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const mac = createHmac('sha1',key).update(counter).digest(); const offset = mac[mac.length-1] & 15;
  return ((mac.readUInt32BE(offset) & 0x7fffffff) % 10**digits).toString().padStart(digits,'0');
}
module.exports.totp = totp;
