import { UAT_APP_ORIGIN } from '../lib/uat-safety.cjs';
import { createLineRedactor } from '../lib/uat-log-redaction.mjs';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { config } from 'dotenv';
config({ path: '.env.uat.local', quiet: true });
rmSync('uat-results', { recursive: true, force: true });
const env = { ...process.env, RESEND_API_KEY: '', FROTO_EMAIL_FROM: '', UAT_BASE_URL: UAT_APP_ORIGIN };
for (const key of ['DATABASE_URL', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']) if (env[key]) env[key] = env[key].trim();
env.CLERK_PUBLISHABLE_KEY = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

async function run(command, args) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['inherit', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    const stdout = createLineRedactor(line => process.stdout.write(line));
    const stderr = createLineRedactor(line => process.stderr.write(line));
    child.stdout.on('data', chunk => stdout.push(chunk));
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (status, signal) => {
      stdout.flush();
      stderr.flush();
      resolve(status ?? (signal ? 1 : 0));
    });
  });
  if (code !== 0) process.exit(code);
}
for (const [command, args] of [['node', ['scripts/uat-preflight.mjs']], ['npm', ['run', 'build']], ['npx', ['playwright', 'test']]]) {
  await run(command, args);
}
