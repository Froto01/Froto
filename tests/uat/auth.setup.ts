import { test as setup, expect } from '@playwright/test';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { actors, authFile, db, email, seedActors } from './environment';

setup('prepare owned fixtures and real Clerk sessions', async ({ browser }) => {
  setup.setTimeout(180000);
  await seedActors();
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  await clerkSetup();
  for (const actor of actors) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
    try {
      const page = await context.newPage();
      await page.goto('/auth-test');
      await clerk.signIn({ page, emailAddress: email(actor) });
      await page.goto('/start');
      await expect(page).toHaveURL(actor === 'guest' ? /\/platform\/guest-auctions$/ : /\/platform\/dashboard$/);
      await context.storageState({ path: authFile(actor) });
    } finally { await context.close(); }
  }
  await db.end();
});
