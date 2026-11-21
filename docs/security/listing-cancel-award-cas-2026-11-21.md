# Listing cancellation versus award CAS | 21 November 2026 | DRAFT ONLY

## Finding on exact baseline
At 38627662a93ab6cd7e35a792a46a62de82010904, POST /api/listings/[id]/cancel reads listing status/award inside a transaction but then unconditionally updates by id alone. An award racing after the read could commit its job/fee snapshot, followed by the stale cancellation overwriting AWARDED with CANCELLED. Source-level risk, not evidence of production exploitation. The existing award uses a conditional Listing state claim.

## Actual code correction
Replace only cancellation's unconditional update with updateMany comparing id, the authorised member's companyId, exact previously read status, and awardedBidId null. A zero-row claim returns HTTP 409, without modifying fees, payer policy, award, database schema, tenancy/roles or authorization configuration. Existing ACTIVE and PAUSED cancellation eligibility remains unchanged.

## Evidence/limits/rollback
Thirteen secret-free synthetic cases execute the actual transpiled handler: signed-out, no membership, disallowed role, other tenant, missing row, already awarded, award marker, invalid status, successful ACTIVE/PAUSED, stale lost-claim 409, unexpected DB error. Test mocks are not actual PostgreSQL concurrent transaction proof. Separate branch-scoped read-only GitHub Actions runs npm regression, isolated cases, TypeScript, targeted lint and dependency inventory; record actual results after verifying runs. Branch-only Vercel git auto-deployment is disabled in vercel.json before publishing this draft. No secrets, real UAT, production DB/migrations, security settings or live payments touched. Other listing pause/reopen and tender cancellation paths need separate inspection. Rollback prior to merge: close this draft. After any separately approved integration: revert the isolated handler diff. Production release remains NO-GO.
