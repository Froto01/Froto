import { UAT_APP_ORIGIN } from '../../lib/uat-safety.cjs';
import { test as setup } from '@playwright/test';
import { clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import { establishSession } from './helpers';
import { actors, authFile, closeDatabase, seedActors } from './environment';

setup('prepare owned fixtures and real Clerk sessions', async ({ browser }) => {
  setup.setTimeout(180000);
  await seedActors();
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  await clerkSetup();
  for (const actor of actors) {
    const context = await browser.newContext({ baseURL: UAT_APP_ORIGIN });
    try {
      await setupClerkTestingToken({ context });
      const page = await context.newPage();
      await establishSession(page, actor);
      await context.storageState({ path: authFile(actor) });
    } finally { await context.close(); }
  }
  await closeDatabase();
});
