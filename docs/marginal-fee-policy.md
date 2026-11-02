# Marginal success fees

David requested implementation on 3 November 2026. Applies to new marketplace,
tender (including spot-requirement) and guest awards after approved activation.
The provider pays. Job value excludes GST. Listing/bidding and guest customers
remain platform-fee-free. No payment-provider calls or live charging are added.

| Portion of job value ex GST | Rate |
| --- | --- |
| First $250 | 10% |
| Next $250 (to $500) | 7% |
| Next $1,500 (to $2,000) | 5% |
| Remainder above $2,000 | 3% |

Retain $10 minimum ex GST; no maximum. Sum exact marginal contributions, round
once to cents half-up, then apply the minimum. Calculate 10% GST on the resulting
fee and round separately. A $400 job is $35.50 + $3.55 GST = $39.05; $1,500 is
$92.50 + $9.25; $5,000 is $207.50 + $20.75. Rates apply to portions, never the
entire job based on its band. No drop in fee at thresholds.

## Versioning and historical awards

The existing schema is sufficient: three new immutable policy codes at version 1
select the reviewed schedule in the calculator. The existing percentageBps field
is 1000, representing the first-tier rate only; it is not the effective take rate.
The full schedule, code/version and rounding method are saved in snapshot metadata
under feeCalculation. Existing v1 flat rule codes retain their original calculation.
The calculator rejects inconsistent configuration and unsupported marginal versions.
To change tiers later, add a new supported version; never edit v1 semantics.

Snapshot inserts retain the existing conflict-do-nothing behavior. Historical
awards keep their original fees; no backfill. Completion recognition, billing and
permission rules are unchanged. Existing financial screens display the saved fee,
GST, total and rule identity rather than recalculating at a new rate.

## Release and rollback

This draft does not activate pricing. SQL files are deliberately outside automatic
Prisma migrations. No schema change or production database access is needed to
prepare/review this PR.

1. Complete static checks and isolated authenticated award-to-completion UAT for
   all three types. Verify provider fee disclosure before the provider commits,
   including consent/terms and correct fee summaries. This disclosure review is a
   release prerequisite, not certified by calculator tests.
2. With separate merge/deployment approval, deploy marginal-capable code while
   old rules remain active. Verify old jobs and fee history unchanged.
3. With explicit database approval, inspect current rules and run
   docs/sql/prepare-marginal-fees.sql in the approved environment (creates inactive
   rules). Run docs/sql/activate-marginal-fees.sql only after release checks pass.
   Activation aborts unless all original and prepared rules match expectations.
4. Verify a synthetic $400 award snapshots $35.50 ex GST/$3.55 GST, starts CALCULATED
   and only earns on the existing completion lifecycle. Verify duplicate awards,
   existing snapshots, overlap rejection and cancelled/disputed handling.
5. If rollback is approved, run docs/sql/rollback-marginal-fees.sql. Keep compatible
   code for historical marginal snapshots. Do not delete/reprice old fees.

Preparation, activation and rollback SQL have NOT been executed by this work.
Production build, UI disclosure and authenticated UAT require separate evidence.

## Project-manager handoff

Completed: implementation and synthetic tests for marginal calculation, versioned
snapshot integration, and reviewable activation/rollback scripts. No merge,
deployment, rule activation, live payments or production writes.

Evidence: draft PR, exact commit SHA and command results recorded in its body.
Blockers: isolated database activation/rollback rehearsal, authenticated UAT,
provider-facing disclosure/consent review and release approvals.
Next: review draft, resolve blockers, then release through Froto Build Gate.
David should return to **Froto Build Gate Failure**. When the release evidence is
complete, approval wording: "Approve merging the reviewed marginal-fee PR and
deploying its compatible code. Keep database fee-rule activation and live payments
disabled pending separate approval." Reporting is not approval.
