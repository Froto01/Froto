# Automated Froto UAT

Status: the original 128 regressions and five real browser tests passed on 28 October 2026 (Actions run 40637257548, attempt 2, commit 38627662a93ab6cd7e35a792a46a62de82010904). The expanded matrix below requires its own passing run; see the current Actions report for executed evidence. A browser matrix pass is distinct from blocked optional coverage and overall launch sign-off.

## One-time secure configuration

Open https://github.com/Froto01/Froto/settings/secrets/actions and add these repository secrets:

| Name | Value source |
| --- | --- |
| UAT_DATABASE_URL | Neon project wild-smoke-56425660 → branch automated-uat-20261028 (br-weathered-waterfall-axf6glr6) → Connect → database froto_automated_uat → pooled PostgreSQL connection string |
| UAT_CLERK_PUBLISHABLE_KEY | Clerk development instance → API Keys → publishable key, beginning pk_test_ |
| UAT_CLERK_SECRET_KEY | The same Clerk development instance → API Keys → secret key, beginning sk_test_ |

Do not use the production database, the older human UAT database, or Clerk live-instance keys. Clerk only reveals a full secret at creation time. Add a separate Development secret named Froto automated UAT and copy it immediately. Keep the existing default key in use by the app. Shortened visible previews containing an ellipsis are not usable keys. Enter values directly in GitHub, never in chat. Vercel did not disclose its existing Clerk secret values to the connector. The dedicated database already has the current Prisma schema, a database-comment isolation marker and the approved three launch fee rules. It contains no copied user or company data. Its pinned pooled hostname is ep-damp-snow-axcqoelf-pooler.c-4.us-east-2.aws.neon.tech.

## Execution and evidence

The `.github/workflows/uat.yml` workflow runs on pushes to spot-requirements or automated-uat, and supports workflow_dispatch when available on the default branch. It first runs 130 route/fee/safety/TOTP regression tests and TypeScript checks. It then builds and starts the real Next.js app on localhost:3100 inside the GitHub runner and runs Playwright against that app in desktop Chrome, Firefox and WebKit, Android Chrome (Pixel 7 emulation) and iPhone WebKit (iPhone 13 emulation). Emulation is not physical-device testing. No Vercel protection bypass is needed.

Four fixed development-only Clerk identities use `+clerk_test` email addresses; the official Clerk testing helper signs them in. The runner creates their synthetic Froto users and three provider companies only after checking the pinned host, database name, database comment and fixture ownership. Real MFA/email delivery is outside this suite. Outbound application email is disabled.

The required matrix is 33 tests: one authentication setup, six journeys per browser profile (30), and two additional Chrome race tests. The report checks both total results and exact per-profile test counts; filtering tests cannot produce a full-matrix pass.

1. Signed-out API permissions.
2. Collapsed dashboard, no duplicate Financials navigation, all six canonical units, slots persisted, misspelling rejection.
3. Existing complete guest journey, bid privacy, lifecycle and review, with fee and notification reconciliation.
4. Existing simultaneous guest awards: one winner, one fee, one notification.
5. Complete marketplace UI creation/bidding/award/company lifecycle and two-sided reviews. Rival bidder identities are anonymous before award; bid prices are public under the existing marketplace policy. Listing owner is provider and selected bidder is buyer.
6. Complete tender UI creation/two sealed responses/award/company lifecycle and two-sided reviews. Competing responses and private notes are hidden. Tender owner is buyer, chosen supplier is provider.
7. Chrome-only concurrent marketplace and tender awards: one HTTP success and one conflict, one job, coherent source winner and matching fee, one winner notification.

Business journeys wait for the real minute-granularity bidding deadline; they do not alter database timestamps. Provider accepts and starts, buyer submits required completion details, provider confirms completion. This company workflow differs from guest completion. Wrong actors, early reviews, repeated transitions/awards/reviews, missing completion details and duplicate tender responses are rejected. Fee payer is always reconciled to the job provider; CALCULATED becomes EARNED on completion, with no invoicing/payment.

Private fixture manifests are unique per browser profile and test case, including a test-ID hash. Failed tests retain their own evidence/records and cannot be cleaned by a different successful test, including after a worker restart. Each passing test cleans up only its own captured sources. Successful cleanup validates source owner, exact run marker, title prefix and job parties before removing that run's notifications, fee snapshots, jobs/events/reviews and sources. Database pools reopen between files, while original auth identities remain reusable.

The workflow uploads HTML, JSON and JUnit results, screenshots and reconciliation evidence as a seven-day Actions artifact. It excludes authentication storage, secrets, traces and videos. An incomplete, skipped or flaky run cannot produce a full PASS summary. Screenshots may contain only synthetic test data in the dedicated database. Successful runs remove only their own captured test jobs/requirements after assertions; failed runs retain those fixtures for investigation. Fixed test identities remain for reuse.

## Separately gated coverage

Every Actions run records `uat-results/optional-coverage.json` separately from the required browser matrix. BLOCKED is never counted as PASS.

**Deployed preview:** a read-only HTTP smoke checks the verified branch alias https://froto-git-spot-requirements-david-froto-project.vercel.app (discovered via Vercel, latest verified source 38627662). It checks public pages and signed-out API responses, without authenticated mutations, cookies or bypass tokens. On 28 October the alias returned HTTP 302 to Vercel sign-in; therefore deployed coverage is BLOCKED by Deployment Protection. It needs legitimate deployment access or an approved accessible UAT preview. A local app pass does not verify a deployed app. No private dashboard or authenticated bypass URL is published.

**Actual email and MFA:** `tests/auth/real-auth.spec.ts` and `playwright.auth.config.ts` are prepared separately; these tests have not executed without the fixtures below. They use the ordinary Clerk sign-in UI, not testing tokens/sign-in tickets. One test waits for a real email OTP in a dedicated inbox; the other asserts `needs_second_factor` and verifies enrolled TOTP. TOTP generation is checked against RFC 6238 SHA-1 reference vectors. UI compatibility and actual delivery remain unverified until configured.

Before enabling, an authorised administrator must provide two owned Clerk Development accounts with privateMetadata.fixture = FROTO_AUTOMATED_UAT_V1. The email account must support email-code sign-in without TOTP; the MFA account must have a password and authenticator TOTP enrolled. These must not be +clerk_test addresses (those suppress real email). The inbox must belong to the dedicated fixture, with no unrelated personal/business messages exposed.

Add repository secrets UAT_EMAIL_ADDRESS, UAT_TEST_INBOX_URL, UAT_TEST_INBOX_TOKEN, UAT_MFA_EMAIL, UAT_MFA_PASSWORD and UAT_TOTP_SECRET. The HTTPS inbox adapter accepts authenticated POST {recipient, receivedAfter} and returns 204 while waiting, or {recipient, receivedAt, messageId, code}; returned recipient and timestamp must match the requested new message. The adapter must restrict its token to that owned test inbox. The runner never uploads message content, OTPs, passwords, TOTP secrets, auth-state files or raw auth results. Authentication evidence stays in ignored playwright/.auth; only sanitised counts/statuses are uploaded.

Explicitly enable repository variables UAT_REAL_AUTH_ENABLED=1 and UAT_AUTH_FIXTURE_CONFIRMED=OWNED_DEVELOPMENT_FIXTURES only after authorising test delivery to those fixtures. Missing settings produce BLOCKED without sign-in requests or real emails. If enabled checks fail, the job fails; they do not silently skip. Application opportunity email remains disabled. Existing helper-based sign-in does not establish email delivery/MFA coverage.

Remaining launch scope includes every role, accessibility audits, real devices and other acceptance rows not represented by these assertions. No full-launch acceptance claim follows from this suite.

## Overnight operation

A ChatGPT scheduled task can re-run the current branch's latest Actions regression job and its dependent browser job and report the result. GitHub native scheduled workflows only run from the default branch; this workflow does not claim a feature-branch cron is active. The task must verify Actions write access and an actual runnable workflow before reporting overnight execution as configured. GitHub limits re-runs to recent workflow runs (30 days); a stale run must be reported as blocked rather than presented as a new test. A new code push creates a fresh run.

## Local commands

Use Node 24 and npm ci, then npm test, npx tsc --noEmit and npm run uat:list. Supply DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in the environment or ignored .env.uat.local. npm run uat:check validates configuration; npm run uat clears old results, validates, builds and runs Playwright. Install Chromium first with npx playwright install --with-deps chromium.

Local expanded-suite verification covers regression tests, TypeScript, changed-file lint and discovery of the declared matrix. Real browser/database verification executes in GitHub Actions using existing valid secrets. Inspect the specific tested commit and run; discovery and prepared optional tests are not execution evidence. Browser runs may take about 15–25 minutes because business bidding deadlines expire naturally.
