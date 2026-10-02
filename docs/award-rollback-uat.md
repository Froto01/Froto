# Real award transaction rollback UAT — 1 October 2026

Status: browser failures and database rollback outcome PASS for all six attempts; independent injected-error-stage log confirmation blocked by Vercel billing limit.

Runner: https://froto-jthjmv63n-david-froto-project.vercel.app/platform/uat/award-rollback
Git branch: billing-uat, commit bc144aec275eaa89dc39c8a0cb7797af5a1dec68.
Isolated Neon branch: br-fancy-heart-axjf1fzn.

The existing spot, marketplace and tender award handlers are unchanged. The test branch adds a gated browser runner for six exact simulated fixtures, owned by Froto test company. It requires the posting company's OWNER/ADMIN/MANAGER user and validates source marker/state/submissions before showing the button.

## Failure injection

Each award path has a fee-failure fixture and a loser-notification-failure fixture. IDs use uat-rollback-{spot|marketplace|tender}-{fee|notification}-20261001. Each has two submissions.

On the isolated database:
- froto_uat_fee_failure_20261001 raises FROTO_UAT_INJECTED_FEE_FAILURE only when TransactionFee INSERT metadata matches the three exact fee-failure source IDs.
- froto_uat_notification_failure_20261001 raises FROTO_UAT_INJECTED_NOTIFICATION_FAILURE only for the three exact notification-failure source IDs and the unsuccessful-result notification types. This occurs after the winner notification, job, award event and fee writes in the real handler.
- The trigger functions return NEW for every other source. They do not change schema/data constraints for normal application records.
- Setup SQL is recorded in uat/award-rollback-fixtures.sql as an isolated UAT reference, not a production migration. The named test-only functions/triggers remain on the isolated branch; removal or branch disposal is a later cleanup step.

Original database checks found zero rollback fixtures and zero failure triggers. Previously completed UAT fixtures are outside the failure rules.

## User action

Sign in as Froto test company on the runner preview, reopen the link after sign-in if necessary, click “Run six rollback checks” once, and send the completed results screenshot.

The runner sends six real authenticated POST requests sequentially, with a 45-second timeout per request, and blocks repeat clicks. It stops if any award unexpectedly succeeds. Expected response is HTTP 500 for each deliberately failing award. HTTP 500 alone is not a pass: the injected error and database rollback must be verified independently.

## Reconciliation required

For each source, confirm original OPEN/ACTIVE status, null awarded identifier/timestamp and unchanged close window; two original bids/responses/offers with pre-award state; zero Job, award event, fee snapshot and result notification records. Verify logs contain the intended injected error at the corresponding failure stage. The original database must still contain no matching test fixture, job or failure trigger.

The loser-notification check must leave no winner notification or fee snapshot despite those writes occurring earlier in the transaction. This tests the complete existing handler and PostgreSQL transaction, rather than a mocked rollback or a standalone SQL approximation.

Lint, TypeScript and whitespace checks passed for the two new TSX files. No award API or fee rule was modified. The existing 91-test application route suite was not changed for this runner.

## Results — received 1 October 2026, 10:05 Brisbane

Screenshot image(20260930-221449).png shows all six authenticated award attempts returned HTTP 500: fee creation and loser-notification failure for spot, marketplace and tender. Screenshot filename suggests the test ran around 08:14 Brisbane; the exact server execution time was not independently established.

Independent Neon reads confirmed all six sources retain their original OPEN/ACTIVE status, null award ID/date, and exact pre-test closing window and updatedAt timestamp. Automated comparison against uat/award-rollback-baseline.json passed for every source. All twelve original bids/offers/responses remain; spot/tender submissions are still SUBMITTED. There are zero related Jobs, award events, fee snapshots and result notifications for every fixture, including no surviving winner notification from the intended loser-notification failure tests.

Original branch contains zero rollback fixtures and zero failure triggers. The scoped test-only triggers remain on the isolated branch as documented. No cleanup was performed against production.

Runtime-log retrieval for the runner deployment over 22:13–22:16 UTC on 30 September failed with ExceedsBillingLimitError. This is not evidence that logs were absent. The intended injected-error messages could not be independently retrieved for each request. Therefore database rollback outcomes and expected HTTP failures are PASS, while independent failure-stage attribution remains unresolved. Do not claim fully evidenced failure injection from HTTP 500 alone.

Post-test source states and comparison results are saved in uat/award-rollback-results.json. Overall launch matrix remains incomplete.

## Evidence gap closed by fresh stage-receipt run — 2 October 2026

Fresh 20261002 fixtures reached all six intended injected failure stages, proven by dedicated database counters that advance immediately before raising the configured errors. Post-run independent reads and exact baseline comparison confirm complete rollback for the prepared scope. See award-rollback-stage-uat.md and uat/award-rollback-stage-results.json. FAIL-07 now passes; the earlier runtime logs remain unavailable and no retrospective attribution is claimed for the first run.
