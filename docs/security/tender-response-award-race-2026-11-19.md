# Tender response / award race | 19 November 2026 | DRAFT ONLY

## Evidence and scoped finding
The existing `POST /api/tenders/[id]/responses` read OPEN/award/window outside its write transaction, then inserted `TenderResponse` later. An award on the parent `Tender` row could commit between that check and insert, admitting a new response after the winner was chosen. This is distinct from isolated guest auction bid PR #57 and spot offer PR #56. The separate `POST /api/tenders/[id]/award` already uses a Serializable transaction and updates the same parent row.

## Candidate correction
Inside one Serializable transaction, acquire a parameterised `SELECT "id" FROM "Tender" WHERE "id" = ${id} FOR UPDATE` row lock, re-read the parent and reject missing, own-company, non-OPEN, awarded or expired tender before creating a response and notification. Return HTTP 409 for duplicate or serialization conflicts (`P2002` / `P2034`). Unexpected errors remain observable. Keep existing membership selection, amount policy, role permissions, offer privacy, fee and payer logic unchanged.

## Verification and limitations
15 secret-free handler tests exercise lock order, stale award and close states, own-company restriction, unauthorized access, success, conflicts and unexpected failures. They do not simulate genuine concurrent PostgreSQL sessions. Branch-scoped CI runs `npm ci`, existing `npm test`, new handler tests, TypeScript, targeted lint and a read-only audit inventory; record final exact-SHA result separately. No Clerk credentials, Neon database, production, UAT or payments needed.

## Risk, sequencing and rollback
Additional 409 responses under contention are intentional and require client refresh. This draft is isolated on baseline `spot-requirements`, **not** based on unrelated #39→#53, #56, #57, #59 drafts. Real Postgres serializable and lock-order verification must be performed before release; review other parent-child mutation paths. The branch-only Vercel Git deployment flag is `false` for exactly this draft name; no project settings are modified. Rollback before merge: close this draft PR. After separately approved merge: revert this route/test change, no migration. Keep DRAFT/UNMERGED/UNDEPLOYED until separate owner approval; any protected UAT/auth/database/security configuration, financial or release step remains out of scope.
