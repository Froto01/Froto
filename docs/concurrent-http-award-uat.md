# Concurrent HTTP award UAT — 1 October 2026

Status: fixture and browser runner prepared. Live execution and database reconciliation pending.

Runner: https://froto-kuhuv35k7-david-froto-project.vercel.app/platform/uat/award-concurrency
Git branch: billing-uat; commit 97ec6596619dcfbb9f2a6f9c48c3d7b349c2b5db.
Neon branch: br-fancy-heart-axjf1fzn.

The runner page exists only on billing-uat, not on the working/production branch. It checks the signed-in user's first company membership, requires Froto test company and an OWNER/ADMIN/MANAGER role, and validates the fixed simulated fixture marker before showing offers. Existing award APIs independently enforce permissions. It sends no requests until the user clicks the clearly labelled test button. A synchronous ref lock prevents repeat clicks; each request has a 45-second timeout.

Fixture uat-http-award-20261001 is posted by Froto test company with two simulated SUBMITTED offers: Hardlywork $250 and Tree of Life $987.65. Neither represents real work. Database reads confirmed OPEN, two offers and zero jobs before testing. Exactly one applicable MARKETPLACE_JOB rule exists (provider-paid 3%, 10% GST on the fee). The original database contained zero matching fixtures.

## User action

Sign in as Froto test company on the runner preview, then reopen the runner link if sign-in lands on the dashboard. Click “Run two simultaneous awards” once and send a screenshot of the results table.

The client initiates both real POST requests in Promise.all without waiting for the first response. It displays both HTTP statuses and request start/finish offsets. Expected result: one HTTP 200 and one HTTP 409. It reports “Expected HTTP result” rather than declaring a complete pass. A winning job link is shown if available.

This executes the complete existing spot award handler, including the simulated job, award event, fee snapshot and normal in-app winner/loser notifications on the isolated database. Do not progress the job lifecycle.

## Reconciliation after screenshot

Check independently through Neon:
- Exactly one Job for the fixture.
- Exactly one AWARDED event for that Job.
- Exactly one TransactionFee snapshot for that Job; status CALCULATED.
- Source awardedOfferId, Job awardedSpotOfferId and offer statuses agree on one winner.
- Exactly one winner notification and one unsuccessful-provider notification for this source.
- Original database still contains no matching fixture or Job.

Browser request interval overlap is evidence of concurrently initiated HTTP requests; runtime request logs can further establish server overlap when available. The earlier SQL connector tests were sequential and do not substitute for this test.

Lint, TypeScript and whitespace checks pass for the two new TSX files. The previously verified application route suite remains 91 tests; no award handler was changed for this runner.
