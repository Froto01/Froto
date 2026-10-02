# Real database fee safeguards UAT — 2 October 2026

Status: PREPARED; authenticated execution and independent database reconciliation pending.

This runner exists only on `billing-uat`. The POST endpoint requires Vercel preview environment, that exact Git branch, same-origin request, an authenticated Froto test company OWNER/ADMIN/MANAGER, and a marker fixture that exists only on the isolated Neon branch `br-fancy-heart-axjf1fzn`.

## Checks

Each of MARKETPLACE_JOB, TENDER_JOB and GUEST_AUCTION runs four checks:

1. Two applicable active rules cause the actual fee helper to throw its overlapping-rule error, with zero snapshots.
2. A GUEST payer causes the actual helper to throw its unsupported-payer error, with zero snapshots.
3. An existing $15 ex-GST snapshot remains byte-for-byte equivalent after changing the underlying rule from 3% to 9%; exactly one row exists inside the transaction.
4. Two independent Prisma transactions initiate calls in parallel for one new source ID. Both must return the same persisted CALCULATED fee ID, and an independent query must count one row.

The first nine checks alter rules only inside interactive Prisma transactions and deliberately throw a unique sentinel to roll back. Errors unrelated to that sentinel fail the check. After rollback, each temporary source must have zero fees. The complete FeeRule rows must match the pre-run baseline before collision checks begin. Transactions stop on an unexpected result.

The final three checks retain one simulated CALCULATED fee each, with `uat` metadata `SIMULATED_FEE_SAFEGUARDS_20261002` and source prefix `uat-fee-safeguards-20261002-<UUID>`. They create no jobs, notifications, invoices or payments. Do not invoice these simulated records. Source IDs and client initiation/completion offsets appear in the result details. Parallel initiation does not by itself prove a particular database lock/snapshot overlap.

## Operator step

Open `/platform/uat/fee-safeguards` on the new preview, signed in as Froto test company. Click **Run fee safeguards** once. Keep the page open; send the completed screenshot including its run ID. If a result needs review or times out, investigate before retrying.

## Independent reconciliation

Using the returned run ID, inspect TransactionFee rows whose sourceId starts with that ID. Expect exactly three, one per fee type, all CALCULATED, $500 transaction amount, $15 ex GST, $1.50 GST and $16.50 inclusive under the current launch rules. Confirm zero temporary rule codes with that prefix, zero temporary overlap/payer/immutable fee rows, unchanged original five rules, and no matching artifacts on the original branch.

## Scope

This exercises the deployed production fee helper, real Prisma adapter and real PostgreSQL constraints. It does not execute complete award handlers under invalid rules, so FAIL-08/09 full-award integration remains pending even if these checks pass. It does not resolve FAIL-07 injected failure-stage attribution. No production code or production database configuration changes are part of this runner.

Preparation validation: local TypeScript and changed-file ESLint pass; all 116 existing regression tests pass. The fee helper on billing-uat matches the tested source (Git blob ecbb380d7c3705f7e49303dd44289fef9330552a).
