# Rollback failure-stage evidence — 2 October 2026

Status: PASS for fee and loser-notification failure rollback in spot, marketplace and tender. Authenticated execution and independent reconciliation completed.

The previous six award failure checks established rollback outcomes. Their Vercel logs were unavailable due to ExceedsBillingLimitError, so the intended failure stages could not be independently attributed. This run addresses that evidence gap with fresh isolated fixtures and database counters. It does not retroactively establish the first run's error messages.

## Isolation and receipts

Fixtures are `uat-rollback-{spot|marketplace|tender}-{fee|notification}-20261002`, with notes `SIMULATED_ROLLBACK_STAGE_UAT_ONLY`, owned by Froto test company. Each has Hardlywork and Tree of Life submissions. All six sources and twelve submissions are recorded in `uat/award-rollback-stage-baseline.json`; all stage counters begin at zero. No jobs, events, fees or notifications exist for these new fixtures. Original database has zero matching fixtures or counters.

Six dedicated CACHE 1 sequences record failure-stage arrival. PostgreSQL documents that nextval values are not reclaimed when the calling transaction aborts: https://www.postgresql.org/docs/14/functions-sequence.html. A separate probe sequence was advanced inside a subtransaction that deliberately raised an exception; it still read one afterward. Probe SQL is included in the setup reference. No real fixture counter was advanced by preparation.

The existing test-only trigger functions on the isolated branch preserve their original behaviour for the six 20261001 fixtures. For each new exact 20261002 source:

- Fee insert trigger requires a matching Job, exactly one AWARDED event, and the new fee targeting that Job with CALCULATED status. It then increments that source's dedicated counter and immediately raises FROTO_UAT_INJECTED_FEE_FAILURE.
- Loser-notification insert trigger requires a matching Job, exactly one AWARDED event, one CALCULATED fee for the Job, and one existing winner notification. The unsuccessful notification must target the fixture's losing company, Tree of Life. It increments the dedicated counter and immediately raises FROTO_UAT_INJECTED_NOTIFICATION_FAILURE.
- A failed prerequisite raises an error without advancing the counter. Every other source returns NEW unchanged.

Thus a counter advance shows the intended trigger branch was reached after the checked earlier writes. Post-test zero rows then independently establishes those writes rolled back. The setup is an isolated UAT reference, not an application migration. Scoped triggers, six sequences and the probe remain in that branch for later cleanup; none were applied to the original branch.

## Runner

Only billing-uat preview contains the new page and read-only receipt API. Both require the preview environment, billing-uat branch and an authenticated OWNER/ADMIN/MANAGER of Froto test company. The page validates exact markers, source state, submissions and no existing Job before offering the button. The receipt API checks an isolated marker before querying counters, uses static SQL and sends no-store responses.

The browser first requires all six counters to be zero, then sends the existing real authenticated award POSTs sequentially. After each, it reads the corresponding counter. Expected outcome is HTTP 500 plus exactly one stage hit; unexpected results stop the runner. A synchronous click lock and used-counter check prevent accidental repeat tests. No award handler or authentication bypass is added.

Open `/platform/uat/rollback-stage` on the provided preview, sign in as Froto test company, click **Run six stage checks** once, and send the finished screenshot. Expected heading: **All six failure stages recorded**. The database rollback is still checked independently afterward.

## Reconciliation

Compare every source's status, close window, award IDs/dates and updatedAt with the baseline. Compare all twelve submissions. Require one stage hit per exact fixture and zero corresponding Jobs, events, fees or result notifications. Confirm no matching artifacts on the original branch. The six logged counters are stage receipts, not business records or payments.

Validation: TypeScript, changed-file ESLint and whitespace checks pass; all 118 regression tests pass. The counter persistence probe passed. Actual route execution remains pending; FAIL-07 is still PARTIAL until this run and independent reconciliation complete. Overall launch hardening is not GREEN.

## Completed result — 2 October 2026, 11:21 Brisbane

Screenshot image(20261002-012143).png shows six HTTP 500 responses and YES for every failure stage, on preview commit 9f3e3306c9bae726ec105bc8fa009c8f776cf125. Independent connector reads show every dedicated stage counter is exactly one. Counters were zero before the browser run, and each increments immediately before the intended injected exception after its prerequisites are satisfied. This supplies direct database stage attribution for the new run, independent of Vercel runtime logs.

Exact automated comparison with the baseline passes for all six sources: status, close windows, award IDs/dates and updatedAt are unchanged. All twelve submission IDs and statuses match the baseline. There are zero matching Jobs, award events, fee snapshots or result notifications, including zero surviving winner notifications after the loser-notification failures. Original database has zero matching fixtures, Jobs, fees, notifications or stage/probe sequences. Results are in uat/award-rollback-stage-results.json.

FAIL-07 is now PASS for the planned fee and loser-notification failure stages across all three existing award routes. The original run's unavailable logs remain unavailable; they were not retrospectively recovered. The new run closes that acceptance evidence gap. Test-only triggers and receipts remain on the isolated branch. Do not repeat these fixtures. Full invalid-configuration awards and other launch rows remain pending.
