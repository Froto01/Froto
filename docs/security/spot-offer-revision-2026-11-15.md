# Spot offer revision/award race | 15 November 2026 | DRAFT ONLY

Base candidate: `38627662a93ab6cd7e35a792a46a62de82010904`. Branch: `security/spot-offer-revision-race-20261115`. Scope: existing owner-authorised security application-code corrections only.

## Finding and change
Original PATCH checks requirement/offer outside a transaction, then updates offer by ID without a status predicate. Concurrent award can change the offer to AWARDED and create an immutable job/fee snapshot while PATCH subsequently overwrites that offer's quoted amount. Award already uses a Serializable transaction and a conditional requirement claim.

PATCH now re-reads requirement and same-company offer inside Serializable; rejects closed/awarded/expired requirements; conditionally updates only the still-SUBMITTED provider-owned offer; maps lost claims and Prisma P2034 serialisation failures to HTTP 409. Competing offers remain sealed. No fee logic, payer policy, auth rules, schema, migrations, UAT credentials or production settings altered. Existing preflight role checks remain; current tests exercise synthetic race interleavings, not a PostgreSQL concurrency integration.

## Verification/limits
Separate **secret-free** draft-branch CI runs existing npm regressions, TypeScript and targeted lint. No credential-bearing browser UAT, DB operations, payment/provider calls or production deploy. This security PR is not the baseline UAT candidate. The branch-specific Vercel deployment-disable entry is bundled in the initial complete commit to avoid accidental preview with shared environment variable scopes.

Remaining: POST-offer/award races also need review; award and fee snapshot must be tested together against a dedicated synthetic DB, with no fee rule/payer changes until approved. Zero applicable fee rules currently permits null snapshot; choosing a fail-closed commercial rule or free exception requires a separate product/financial decision. Dependency lockfile has not been modified or audited in this draft.

## Risk and rollback
Serializable revision may return 409 under contention and requires client refresh/retry; do not blindly resubmit awards or charges. Review for unexpected query plans/connection behavior. Rollback by closing the unmerged PR; after a separately approved integration, revert this scoped code/test commit, with no migration rollback. No release authorisation is implied.
