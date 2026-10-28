import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { config } from 'dotenv';
config({ path: '.env.uat.local', quiet: true });
rmSync('uat-results', { recursive: true, force: true });
const env = { ...process.env, RESEND_API_KEY: '', FROTO_EMAIL_FROM: '', UAT_BASE_URL: 'http://localhost:3100' };
env.CLERK_PUBLISHABLE_KEY = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
for (const [command, args] of [['node', ['scripts/uat-preflight.mjs']], ['npm', ['run', 'build']], ['npx', ['playwright', 'test']]]) {
  const result = spawnSync(command, args, { env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
