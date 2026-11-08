# Draft UAT connection-target hardening

This unmerged patch builds on protected-UAT draft PR #39 (base `b414f954b05e2ca6744773e34e5dcc2fc90abad7`) and implements one bounded part of security plan #47. It does not enable UAT, change environment protections, run migrations, or approve deployment.

## What changes

`checkUatEnvironment` now validates a supplied `DIRECT_URL` using the same pinned database hostname and database name as `DATABASE_URL`. Direct and pooled endpoints for the approved UAT database are accepted; other endpoints, databases, ports and URL fragments are rejected. The UAT runner trims both URL variables consistently.

Database connection query options are deny-by-default. Supported options are `sslmode=require|verify-ca|verify-full`, `channel_binding=prefer|require`, and a positive integer `connect_timeout`. Duplicate or unknown options are rejected. This prevents a driver from using a query parameter to override the validated hostname, database, port or credentials. Rejection messages contain variable names and fixed explanations only, not input values.

The current browser workflow does not run migrations or require `DIRECT_URL`, so an absent value remains valid. An explicitly supplied empty, invalid or out-of-scope value is rejected. No secret is added, copied, read, or printed by this patch.

## Scope and remaining gates

The existing preflight runs before build/browser execution. Existing fixture setup and cleanup also call `checkUatEnvironment`; their database marker and ownership checks remain unchanged. This is a configuration guard, not a database connection test or a guarantee about arbitrary Prisma commands run outside the UAT pathway. `prisma.config.ts` is unchanged. Do not run a migration under this patch's authority.

Full protected-environment configuration and credential placement still need separate verification. PR #39's environment gate and output-redaction changes remain required. No authenticated browser run, database operation, production build or deployment is proved by pure helper tests. Dependency vulnerabilities, transaction races and fee-policy findings are separate unfinished work.

Compatibility: previously accepted extra URL options now fail closed. If an approved UAT target needs another option, review its driver semantics and add explicit synthetic tests before expanding the allowlist. Do not weaken the guard just to make a connection work.

## Synthetic checks

Run `node --test lib/uat-safety.test.mjs lib/uat-log-redaction.test.mjs lib/uat-publication-safety.test.mjs` with a clean environment. All URLs and authentication-shaped strings in the tests are dummy fixtures; these tests do not connect to any database or auth service. The tests cover target mismatches, pooled/direct equivalence, query overrides, duplicate parameters, malformed values, redacted errors, runner ordering and actual preflight failure stopping synthetic build/browser commands. Publication tests inspect configuration only; they do not prove Vercel's remote outcome.

Also run `npm test`, TypeScript, relevant lint and syntax checks where installed dependencies permit. Record actual results separately, including any blocked or unrun steps. Browser UAT and direct database verification require separate approval.

## Rollback and publication

Before integration, discard the local patch or close the eventual draft PR. After separately approved integration, revert this patch's files. There is no schema or data rollback.

The root `vercel.json` disables automatic deployments for `security/uat-target-hardening-20261109` only. All other branches retain Vercel's default behavior. This rule must be present in the first remotely referenced commit. The current project preview environment is not verified isolated from production, so this draft must not create a preview. Verify Vercel deployment records for the exact branch and SHA after publication. No Vercel project-wide setting, credential or production configuration is changed.

The new branch-scoped workflow runs secret-free regressions, explicit redaction/publication tests, TypeScript and targeted lint against the exact head. It does not trigger the credential-bearing browser UAT workflow, deploy, migrate or merge. A future isolated preview needs its own configuration verification and approval. Do not remove the branch deployment guard until that is resolved.
