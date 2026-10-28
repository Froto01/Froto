import 'dotenv/config';
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

config({ path: '.env.uat.local', quiet: true });
import { checkUatEnvironment } from "../lib/uat-safety.cjs";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = checkUatEnvironment();
  mkdirSync('uat-results', { recursive: true });
  writeFileSync('uat-results/preflight.json', JSON.stringify({ status: errors.length ? 'BLOCKED' : 'READY', errors, checkedAt: new Date().toISOString() }, null, 2));
  if (errors.length) { console.error(`UAT BLOCKED:\n${errors.join('\n')}`); process.exitCode = 2; }
  else console.log('UAT preflight passed: dedicated database, development auth, outbound email disabled.');
}
