import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/auth', workers:1, retries:0, timeout:180000, forbidOnly:!!process.env.CI,
  outputDir:'playwright/.auth/real-auth/browser',
  reporter:[['list'],['json',{outputFile:'playwright/.auth/real-auth/results.json'}]],
  use:{...devices['Desktop Chrome'],baseURL:'http://localhost:3100',trace:'off',video:'off',screenshot:'off'},
  webServer:{command:'npm run start -- --hostname localhost --port 3100',url:'http://localhost:3100/auth-test',reuseExistingServer:false,timeout:120000,env:{RESEND_API_KEY:'',FROTO_EMAIL_FROM:''}},
});
