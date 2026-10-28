import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ path: '.env.uat.local', quiet: true });

export default defineConfig({
  testDir: './tests/uat',
  outputDir: 'uat-results/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 120000,
  globalTimeout: 900000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { outputFolder: 'uat-results/html', open: 'never' }], ['json', { outputFile: 'uat-results/results.json' }], ['junit', { outputFile: 'uat-results/junit.xml' }]],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3100', timezoneId: 'Australia/Brisbane', trace: 'off', video: 'off', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run start -- --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100/auth-test', timeout: 120000, reuseExistingServer: false, env: { RESEND_API_KEY: '', FROTO_EMAIL_FROM: '', UAT_BASE_URL: 'http://127.0.0.1:3100' } },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', testMatch: /.*\.spec\.ts/, dependencies: ['setup'] },
  ],
});
