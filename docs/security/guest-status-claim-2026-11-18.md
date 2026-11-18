# Guest auction milestone transition atomicity | 18 November 2026 | DRAFT ONLY

Source: baseline 38627662a93ab6cd7e35a792a46a62de82010904; approved draft-only security plan [PR #47](https://github.com/Froto01/Froto/pull/47); PM [issue #43](https://github.com/Froto01/Froto/issues/43).

## Demonstrable pre-patch risk
`POST /api/guest-auctions/[id]/status` checked current status and authorized guest/winning company in a transaction, then used `guestAuction.update({where:{id}})`. Two overlapping requests that read the same prior status could both update that row and return success; a delayed write could overwrite a newer status. Under a completion replay, the fee update was separately guarded by CALCULATED, but the status endpoint still indicated an accepted action, obscuring race outcomes.

## Narrow correction
Replace the unconditional update with an atomic `updateMany` claim scoped to `id`, observed prior `status` and `awardedBidId`. Only one claimant continues; a lost claim returns HTTP 409 before any completion-side fee update. Read the committed status/timestamp in the same transaction. Keep role checks, the exact transition graph, existing CALCULATED→EARNED logic, fees/payer and database schema unchanged. This does NOT authorize financial release.

## Tests, residual risk and rollback
Five synthetic route-handler cases added to the existing npm regression suite: unsigned deny, courier cannot complete, lost claim causes zero fee writes, successful completion+replay, and winning-company accept vs outsider deny. These mocks prove handler behavior, not PostgreSQL contention, true concurrent transactions or downstream payment behavior. Await exact-head GitHub CI before calling these tests validated on the published commit. No credential-bearing UAT, production access, live payments, migrations or environment/security policy changes. Read-only npm audit inventory logs counts/locked versions; it is not a dependency patch.

Rollback before merge: close this draft PR and delete its isolated branch after review. If approved/merged later, revert the scoped status-handler change and tests; no schema rollback. The new branch has a Vercel *branch-only* deployment-disable declaration before publication; do not disable or bypass it. DRAFT/UNMERGED/UNDEPLOYED.
