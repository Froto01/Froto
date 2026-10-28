# Automated Froto UAT

Status: runner prepared; full authenticated browser execution needs three repository secrets. Do not treat test discovery or regression passes as completed browser UAT or launch sign-off.

## One-time secure configuration

Open https://github.com/Froto01/Froto/settings/secrets/actions and add these repository secrets:

| Name | Value source |
| --- | --- |
| UAT_DATABASE_URL | Neon project wild-smoke-56425660 → branch automated-uat-20261028 (br-weathered-waterfall-axf6glr6) → Connect → database froto_automated_uat → pooled PostgreSQL connection string |
| UAT_CLERK_PUBLISHABLE_KEY | Clerk development instance → API Keys → publishable key, beginning pk_test_ |
| UAT_CLERK_SECRET_KEY | The same Clerk development instance → API Keys → secret key, beginning sk_test_ |

Do not use the production database, the older human UAT database, or Clerk live-instance keys. Enter values directly in GitHub, never in chat. Vercel did not disclose its existing Clerk secret values to the connector. The dedicated database already has the current Prisma schema, a database-comment isolation marker and the approved three launch fee rules. It contains no copied user or company data. Its pinned pooled hostname is ep-damp-snow-axcqoelf-pooler.c-4.us-east-2.aws.neon.tech.

## Execution and evidence

The `.github/workflows/uat.yml` workflow runs on pushes to spot-requirements or automated-uat, and supports workflow_dispatch when available on the default branch. It first runs 128 route/fee/safety regression tests and TypeScript checks. It then builds and starts the real Next.js app on 127.0.0.1:3100 inside the GitHub runner and runs Playwright Chromium against that app. No Vercel protection bypass is needed.

Four fixed development-only Clerk identities use `+clerk_test` email addresses; the official Clerk testing helper signs them in. The runner creates their synthetic Froto users and three provider companies only after checking the pinned host, database name, database comment and fixture ownership. Real MFA/email delivery is outside this suite. Outbound application email is disabled.

Five Playwright tests are discovered, including authentication setup:

1. Signed-out API permissions.
2. Collapsed dashboard, no duplicate financial navigation, canonical unit dropdown and stored value, misspelling rejection.
3. Guest posting, two sealed bids, owner comparison, award, provider accept/start/deliver, guest completion and review. Database assertions reconcile payer, fee, notification and review ownership. Negative checks cover wrong actors, early reviews and repeated actions.
4. Concurrent guest awards: one HTTP success, one conflict, one persisted winner, matching fee and one winner notification.

The workflow uploads HTML, JSON and JUnit results, screenshots and reconciliation evidence as a seven-day Actions artifact. It excludes authentication storage, secrets, traces and videos. An incomplete, skipped or flaky run cannot produce a full PASS summary. Screenshots may contain only synthetic test data in the dedicated database. Successful runs remove only their own captured test jobs/requirements after assertions; failed runs retain those fixtures for investigation. Fixed test identities remain for reuse.

This initial automation does not yet cover every launch acceptance row, every role, marketplace/tender browser journeys, actual email/MFA delivery, accessibility audits or mobile browsers. Existing synthetic route regression tests remain useful but are distinct evidence.

## Overnight operation

A ChatGPT scheduled task can re-run the current branch's latest Actions regression job and its dependent browser job and report the result. GitHub native scheduled workflows only run from the default branch; this workflow does not claim a feature-branch cron is active. The task must verify Actions write access and an actual runnable workflow before reporting overnight execution as configured. GitHub limits re-runs to recent workflow runs (30 days); a stale run must be reported as blocked rather than presented as a new test. A new code push creates a fresh run.

## Local commands

Use Node 24 and npm ci, then npm test, npx tsc --noEmit and npm run uat:list. Supply DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in the environment or ignored .env.uat.local. npm run uat:check validates configuration; npm run uat clears old results, validates, builds and runs Playwright. Install Chromium first with npx playwright install --with-deps chromium.

Workspace verification passed the 128 regression tests, TypeScript, changed-file lint and discovery of five Playwright tests. This workspace could not install a usable Chromium browser; the real browser run must execute in Actions after secrets are configured. The initial missing-secret check must remain BLOCKED, never PASS.
