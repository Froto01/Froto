import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ path: '.env.uat.local', quiet: true });

export default defineConfig({
  testDir: './tests/uat',
  outputDir: 'uat-results/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Stop development candidates at the first failure; a passing matrix still
  // requires all 33 checks. The working nightly branch retains full failure collection.
  maxFailures: process.env.CI && process.env.GITHUB_REF_NAME === 'automated-uat' ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  timeout: 120000,
  globalTimeout: 2100000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { outputFolder: 'uat-results/html', open: 'never' }], ['json', { outputFile: 'uat-results/results.json' }], ['junit', { outputFile: 'uat-results/junit.xml' }]],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3100', timezoneId: 'Australia/Brisbane', actionTimeout: 15000, navigationTimeout: 30000, trace: 'off', video: 'off', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run start -- --hostname localhost --port 3100', url: 'http://localhost:3100/auth-test', timeout: 120000, reuseExistingServer: false, env: { RESEND_API_KEY: '', FROTO_EMAIL_FROM: '', UAT_BASE_URL: 'http://localhost:3100' } },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    ...[
      ['webkit', 'Desktop Safari'], ['mobile-webkit', 'iPhone 13'],
      ['firefox', 'Desktop Firefox'], ['mobile-chromium', 'Pixel 7'],
    ].map(([name, device]) => ({ name, testMatch: /.*\.spec\.ts/, testIgnore: /concurrency\.spec\.ts/, dependencies: ['setup'], use: { ...devices[device] } })),
    { name: 'chromium', testMatch: /.*\.spec\.ts/, dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
  ],
});
