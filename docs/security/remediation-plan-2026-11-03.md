# Froto security remediation plan (draft, 3 November 2026)

Scope approval: user approved preparation of **draft** remediation PRs using synthetic and secret-free tests. This document does not approve merging, deployments, credentials, production DB operations or live payments.

Base: `spot-requirements` at `38627662a93ab6cd7e35a792a46a62de82010904`. Findings require retesting against each eventual patch head.

## P0: Dependency remediation
- Files: `package.json`, `package-lock.json`, related image configuration and CI.
- Independently confirm current GitHub advisories and patched releases before editing.
- Pin compatible patched Next.js / Sharp / PostCSS and align `eslint-config-next`; regenerate lockfile with `npm install --package-lock-only`, do not manually edit transitive versions.
- Add a **secret-free** dependency audit with documented exception process.
- Gate: `npm ci`, `npm audit --omit=dev`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`; investigate any failure. Validate image paths including SVG/remote-image restrictions and abort on regressions.

## P0: Transaction integrity
- Files: `app/api/spot-requirements/[id]/offers/route.ts`, related award handlers, `lib/fee-snapshots.ts`, tests.
- The current PATCH first reads offer status then calls `prisma.spotOffer.update({ where: { id: existing.id } })` without a state guard. Require a conditional write and serialize with the award transition on the **same requirement-level guard**. A guarded offer update alone is insufficient if the award code can race after checking it.
- Keep immutable awarded amount and fee snapshot consistent. Return 409 on lost race, stale state, closed window or already awarded requirement.
- Review `createFeeSnapshotIfApplicable` returning null on zero active fee rules. Do not silently award a chargeable transaction without a valid rule. Decide and explicitly approve any free/no-fee exception before changing business rules.
- Gate: synthetic concurrent PATCH-vs-award tests with both interleavings; repeat POST/award idempotency; zero, duplicate and expired fee-rule scenarios; sealed-offer role isolation; transaction rollback on fee failure.

## P0: UAT fixture isolation and Clerk
- Files: `.github/workflows/uat.yml`, `scripts/uat-preflight.mjs`, `scripts/run-uat.mjs`, `prisma.config.ts`, PR #39.
- Review draft PR #39 before implementing overlapping changes. Keep all credential-bearing actions behind a separately approved protected environment; no credential-bearing run under this approval.
- Ensure both `DATABASE_URL` and `DIRECT_URL` are validated against an approved **synthetic, nonproduction** target before fixture changes or migrations; reject mismatched targets.
- Avoid printing connection strings, cookies, headers, Clerk tokens, Playwright auth state or screenshots with personal data.
- Gate: pure unit/static tests with dummy identifiers and deliberately invalid hosts/DB names; deny-by-default checks on production-like targets; no actual DB connection.

## P1: API roles and repo release controls
- Files: company membership API routes and central permission helper/tests.
- Document approved authority for STAFF, DRIVER, DISPATCHER, MANAGER, ADMIN and OWNER per action. Do not alter role policy without owner sign-off. Assert deny-by-default across companies and sealed bids.
- Propose branch protections requiring reviewed PRs and required successful checks; GitHub settings changes require separate approval.

## PR sequencing and constraints
1. Dependency fixes on a focused branch; no secret-bearing CI.
2. Atomic transaction integrity + fee policy on separate draft PRs, with synthetic concurrency tests.
3. UAT environment and connection-target hardening, building on PR #39 rather than duplicating it.
4. Role matrix and repository protections after specific policy approval.

For each implementation draft PR report: changed paths, head SHA, exact commands and Actions URLs, PASS/FAIL/BLOCKED/NOT RUN, remaining risks, rollback, and explicit approval required. **Do not mark a security finding fixed until tested.**

Project manager handoff destination: separate **Froto Project Manager** conversation. Security approvals return to **this Froto Security Audit conversation**. Reporting does not constitute approval.
