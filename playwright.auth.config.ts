import { UAT_APP_ORIGIN } from './lib/uat-safety.cjs';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/auth', workers:1, retries:0, timeout:180000, forbidOnly:!!process.env.CI,
  outputDir:'playwright/.auth/real-auth/browser',
  reporter:[['list'],['json',{outputFile:'playwright/.auth/real-auth/results.json'}]],
  use:{...devices['Desktop Chrome'],baseURL:UAT_APP_ORIGIN,trace:'off',video:'off',screenshot:'off'},
  webServer:{command:'node scripts/uat-server.mjs',url:`${UAT_APP_ORIGIN}/auth-test`,reuseExistingServer:false,timeout:120000,env:{RESEND_API_KEY:'',FROTO_EMAIL_FROM:''}},
});
