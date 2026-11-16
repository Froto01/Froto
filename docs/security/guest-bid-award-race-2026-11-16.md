# Guest auction bid versus award race | 16 November 2026 | DRAFT/UNMERGED/UNDEPLOYED

**Scope:** prior owner-authorised draft-only application-security bug remediation. Baseline `38627662a93ab6cd7e35a792a46a62de82010904`; issue [#41](https://github.com/Froto01/Froto/issues/41), tracker [#43](https://github.com/Froto01/Froto/issues/43). Other separate drafts #39, #47, #53 (UAT/security) and #56 (spot offer revision) are untouched, no incompatible branch stacking.

## Source-confirmed finding
Guest auction POST /bids previously read OPEN, unawarded and future deadline outside its eventual `guestAuctionBid.create` call. An award could commit between that stale preflight and bid creation, leaving a private bid submitted after award.

## Narrow correction
Preserves existing company membership/self-bid and sealed-price rules. Performs parameterised `SELECT "id" FROM "GuestAuction" WHERE "id" = [bound id] FOR UPDATE` in `Serializable` Prisma transaction, then re-reads auction state and deadline and inserts the bid atomically before releasing parent row lock. The existing award path updates the same parent row, so both mutations are ordered; serialisation/unique conflicts return HTTP 409. No fee/payer, role/auth policy, schema/migration, secrets, workflow environment, provider, live payments or production changes.

## Evidence, limitations, rollback
New synthetic tests cover lock-before-read-before-write, stale award/closure, deadline, self-bid, deleted parent, P2002/P2034 and unexpected errors. Dedicated GitHub Actions workflow runs npm ci, npm test, TypeScript, targeted lint plus read-only npm audit; results must be checked at exact SHA. `vercel.json` disables Vercel deployments for this draft branch; no web preview or credential-bearing UAT. **NOT validated** against real PostgreSQL lock/wait/deadlock, integrated award concurrency, full browser/tenant matrix, complete build/lint or payment flows. Production release is NO-GO. Potential row contention exists during awards; integration tests needed before merge consideration. Revert the single isolated draft commit or close PR to roll back; no production rollback necessary.
