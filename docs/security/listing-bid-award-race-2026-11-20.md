# Listing bid/award serialization | 20 November 2026 | draft only

## Evidence-based finding
The existing marketplace `POST /api/listings/[id]/bids` uses Serializable isolation but reads availability and highest bid without explicitly locking its parent `Listing` row. The award endpoint updates that same parent. Acquiring a parameterized parent row lock before the active/awarded/expiry/own-company checks makes bid-versus-award ordering explicit. Also, after three consecutive `P2034` conflicts the previous retry loop threw an unhandled exception instead of an expected HTTP 409.

## Candidate only
In the existing Serializable transaction, `SELECT "id" FROM "Listing" WHERE "id" = ${listingId} FOR UPDATE`, then re-read listing and highest bid and preserve original validation, company boundaries, increments, sealed bid/notification behavior. Third exhausted `P2034` now yields 409; unrelated database errors propagate. Existing regression bid fixture gains synthetic parent lock. No fee, payer, award, auth policy, schema/migration or provider changes. Separate from security drafts #39/#47/#53/#56/#57/#59/#60.

## Tests, limits, rollback
Synthetic actual-handler tests assert lock-before-read/insert, stale/awarded/expired/missing cases, self-bid restriction, fresh highest bid, success, serialization retry/exhaustion and unexpected errors. Exact-head GitHub Actions runs `npm ci`, `npm test`, isolated Node tests, TypeScript, targeted lint and a read-only dependency audit; record real result only after checking logs. These tests do not prove real PostgreSQL interleaving; isolated database acceptance and wider tenant/role testing are still blocked by safety scope. Auto-deploy disabled for **this draft branch only** in committed `vercel.json`, with no Vercel settings changed. No UAT secrets or production testing. Before merge rollback is close draft; after separately authorized integration, revert this handler/test change. Release NO-GO.
