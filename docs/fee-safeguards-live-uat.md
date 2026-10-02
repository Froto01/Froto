# Real database fee safeguards UAT — 2 October 2026

Status: PARTIAL — nine real-database checks passed; marketplace parallel duplicate creation needs review. Tender and guest collision checks did not run.

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

## First execution — 2 October 2026

Screenshot `image(20261002-004034).png` shows run `uat-fee-safeguards-20261002-52e4d593-87c5-4f64-9496-fe67eb661ab9` on preview commit `4f645d9838432d11644d9c336cdaa05dbf7749e4`. All nine overlap/payer/immutable checks passed. MARKETPLACE_JOB parallel duplicate creation displayed REVIEW and stopped the runner. The screenshot leaves Check details collapsed, so the returned call counts/timings are not yet available. No specific exception cause is established.

Independent Neon reads confirm exactly one fee for the run: `cmuq8k9zx000f04l6lrbuqzy7`, MARKETPLACE_JOB, CALCULATED, $500 amount, $15 ex GST, $1.50 GST, $16.50 inclusive, with the expected simulated metadata. There are zero overlap/payer/immutable fee rows. All five original fee rules retain their pre-run values and no temporary rules remain. Original database has zero matching fees/rules. See `uat/fee-safeguards-results-20261002.json`.

The no-duplicate database outcome holds for this attempt, but the runner did not confirm both callers successfully returned the same fee. This is a result to investigate rather than a passed collision check. Tender/guest collision tests remain unexecuted. Next evidence: expand Check details on the existing result and capture its contents; do not repeat the test yet.

## Collision remediation prepared — 2 October 2026

The expanded result confirms 1/2 marketplace calls returned and one snapshot persisted. The rejected exception was not captured by the first runner, so its precise code remains unknown. A local recording driver adapter running the project's actual Prisma 7.9.1 client reproduced the old empty-update upsert as SELECT, INSERT without ON CONFLICT, then SELECT. This establishes a race in the old persistence path consistent with the live result; it does not retroactively identify the rejected exception. Prisma documents concurrent client-managed upsert failures at https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference#unique-key-constraint-errors-on-upserts.

The helper now uses createMany with skipDuplicates, followed by findUniqueOrThrow for the canonical key. The actual query compiler regression verifies INSERT ON CONFLICT DO NOTHING, followed by SELECT, without an existing-row UPDATE. No existing fee fields or timestamps are updated. Unexpected database errors propagate; Serializable conflicts still reach the award handlers' existing 409 handling. Read Committed duplicate callers can read the winning row after the guarded insertion completes.

All 118 tests pass, including unchanged snapshot semantics, insert-error propagation without querying an aborted transaction, and actual Prisma SQL generation. TypeScript and ESLint pass with one pre-existing unused-parameter warning in the guest wrapper. The new UAT runner reports safe Prisma error codes for any rejected collision call. Live verification of this fix is pending; a new preview run uses fresh source IDs and retains the first run's evidence.
