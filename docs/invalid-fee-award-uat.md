# Full award invalid fee-configuration UAT — 2 October 2026

Status: PREPARED; authenticated execution and post-test reconciliation pending. FAIL-08/09 are not yet closed.

The helper-only fee tests passed. This test executes the complete existing spot, marketplace and tender award handlers, with real Clerk authentication and real Serializable Prisma transactions, when an overlapping active rule or unsupported GUEST payer becomes visible to the transaction.

## Fixtures and injection

Six fresh isolated fixtures use `uat-invalid-fee-{spot|marketplace|tender}-{overlap|payer}-20261002`, with marker SIMULATED_INVALID_FEE_UAT_ONLY, Froto test company as poster, Hardlywork as selected submission and Tree of Life as the other submission. Exact source states, twelve submissions, complete five fee-rule rows including timestamps, and zero initial counter/artifact counts are saved in uat/invalid-fee-award-baseline.json. Original branch contains no matching fixtures, invalid rules, counters or trigger.

A test-only AFTER INSERT Job trigger is installed only on isolated branch br-fancy-heart-axjf1fzn. It returns NEW immediately for all other source IDs. For an exact test source it first requires an AWARDED Job and exactly one applicable active rule. For overlap mode it inserts one additional applicable rule of the matching type, then verifies two rules exist. For payer mode it sets the existing rule's payerType to GUEST, then verifies the change. It advances that source's dedicated sequence receipt after the invalid configuration exists.

All configuration mutations occur inside the same award transaction as the source claim and Job creation. Normal fee-rule validation then throws, rolling back the added rule or payer/timestamp mutation with the award writes. Other transactions cannot read those uncommitted configuration changes, although payer-mode tests briefly lock the rule row. No invalid rule is deliberately committed or activated globally. Setup SQL is an isolated UAT reference, not an application migration. The trigger, function and six receipt sequences remain on that branch for later cleanup.

## Actual handler invocation

The UAT-only API wrapper requires billing-uat preview, same-origin POST, authenticated Froto OWNER/ADMIN/MANAGER and an isolated fixture marker. It only accepts the three fixed kinds and two fixed modes, constructs exact source and submission IDs, and invokes the corresponding imported existing award POST handler within the same Clerk request context, preserving request headers. The existing handler still performs its own authentication, company/role checks, source/submission validation, guarded source claim, Job/event writes, fee-helper call and transaction rollback. No Prisma or auth function is replaced.

This is an HTTP request to the UAT wrapper followed by the actual handler function; it is not a separate HTTP request to the ordinary award URL. The wrapper catches the real exception to report whether its message exactly matches the expected overlapping-rule or unsupported-payer rejection. Unexpected exceptions and normal handler responses cannot pass. The production handlers and fee helper are unchanged by this UAT addition. The wrapper is absent from the working/production branch.

## Browser step

Open /platform/uat/invalid-fee-award on the provided preview, sign in as Froto test company, click **Run six invalid-rule awards** once and send the completed screenshot. Expected heading: **All six invalid-rule awards rejected**.

The client first checks six zero receipts, then runs sequential HTTP POSTs with 45-second timeouts. A pass requires HTTP 500, the expected actual handler exception, and exactly one configuration receipt. An unexpected result stops the run; a click lock and used-counter check prevent accidental reruns. The final source/rule/submission reconciliation remains independent.

## Acceptance reconciliation

Compare all source statuses, close windows, award IDs/dates and updatedAt against the baseline; compare all twelve submissions and all five complete FeeRule rows. Require one receipt for each of the six exact cases, zero surviving Jobs/events/fees/result notifications, and zero temporary overlapping rules. Original branch must have no matching artifacts or test configuration. A pass closes the prepared spot/marketplace/tender scope of FAIL-08/09; it does not establish guest-auction full invalid-configuration rollback or the remaining guest browser workflow.

## Preparation validation

All 118 existing regressions pass, along with changed-file ESLint, TypeScript and whitespace checks. Fourteen temporary wrapper checks use synthetic Clerk/handler stubs to verify production/other-branch/unsigned/other-company/staff/original-database denial, invalid selection, six expected rejection mappings and failure on an unexpected exception. These wrapper checks establish gating and reporting logic only; the actual live handlers and database effects are still pending. Every receipt remains zero before browser execution.
