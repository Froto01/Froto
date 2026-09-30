# Froto Launch Hardening Regression Matrix

Target launch: 1 January 2027

Purpose: protect the proven core marketplace while commercial decisions remain gated. This matrix is ordered by launch risk, not UI polish.

## P0 — transaction-critical regression

| ID | Flow | Expected result | Status |
| --- | --- | --- | --- |
| MKT-01 | Create marketplace listing | Listing persists and appears to eligible users | TODO |
| MKT-02 | Place valid bid | Bid persists, ranking/history update correctly | TODO |
| MKT-03 | Reject invalid/low bid | Server rejects without changing listing/bid state | TODO |
| MKT-04 | Close bidding | Listing no longer accepts bids | TODO |
| MKT-05 | Award valid bid | Listing becomes AWARDED and exactly one Job is created | PASSED — Sydney UAT + Neon verification |
| MKT-06 | Double-award attempt | Second award is rejected; no duplicate Job | PASSED — awarded UI locked + exactly one Job verified |
| MKT-07 | Award with no active fee rule | Award succeeds; no TransactionFee snapshot is created | PASSED — Neon verified zero fee snapshots |
| JOB-01 | Winner accepts job | AWARDED -> ACCEPTED | PASSED in prior UAT |
| JOB-02 | Provider starts job | ACCEPTED -> IN_PROGRESS | PASSED in prior UAT |
| JOB-03 | Buyer submits completion details | IN_PROGRESS -> DELIVERED; details retained in history | PASSED in prior UAT |
| JOB-04 | Provider confirms completion | DELIVERED -> COMPLETED | PASSED in prior UAT |
| JOB-05 | Completed job on both dashboards | Both parties see Completed job and agreed value | PASSED in prior UAT |
| JOB-06 | Audit history | Awarded -> Accepted -> In progress -> Delivered -> Completed in order | PASSED in prior UAT |
| JOB-07 | Review unlock | Reviews available only after completion | PASSED in prior UAT |
| TND-01 | Create tender | Tender persists and is visible while open | TODO |
| TND-02 | Submit tender response | Response persists for responding company | TODO |
| TND-03 | Award tender response | Tender becomes AWARDED and exactly one Job is created | TODO |
| TND-04 | Double-award tender | Second award is rejected; no duplicate Job | TODO |
| TND-05 | Tender award with no active fee rule | Award succeeds; no TransactionFee snapshot is created | TODO |
| GST-01 | Guest auction create/bid/award | Existing guest auction flow remains functional | TODO |
| GST-02 | Guest silent-auction privacy | Competing bid values are not exposed before award | ROUTE REGRESSION PASS — bidder sees own bid only; poster sees comparison; browser UAT pending |
| GST-03 | Guest review | Guest can review awarded company only after eligible completion state | TODO |

## P0 — permissions and tenant isolation

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| SEC-01 | Unauthenticated award request | 401/redirect; no data mutation | ROUTE REGRESSION PASS — marketplace, tender and spot; browser UAT pending |
| SEC-02 | Company B attempts to award Company A listing | 403; no mutation | ROUTE REGRESSION PASS — all three award handlers; browser UAT pending |
| SEC-03 | Staff role attempts restricted award | 403; no mutation | ROUTE REGRESSION PASS — all three award handlers; browser UAT pending |
| SEC-04 | Wrong company attempts job lifecycle action | 403; no mutation | ROUTE REGRESSION PASS — all four transitions; browser UAT pending |
| SEC-05 | Buyer attempts provider-only transition | Rejected | ROUTE REGRESSION PASS — buyer rejected from provider transitions; browser UAT pending |
| SEC-06 | Provider attempts buyer-only completion submission | Rejected | ROUTE REGRESSION PASS — provider rejected from DELIVERED; browser UAT pending |
| SEC-07 | User accesses another company's private dashboard data | No tenant leakage | PARTIAL — private job API and spot detail route tests pass; dashboard/browser coverage pending |
| SEC-08 | Non-admin accesses platform-admin actions | Rejected server-side | ROUTE REGRESSION PASS — actual admin guard rejects regular owner and unsigned user; browser UAT pending |
| SEC-09 | Review submitted for unrelated job/company | Rejected | ROUTE REGRESSION PASS — unrelated company rejected before writes; browser UAT pending |
| SEC-10 | Notification read/update for another user/company | Rejected | ROUTE REGRESSION PASS — scoped list and foreign notification PATCH; browser UAT pending |

## P1 — failure states and concurrency

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| FAIL-01 | Double-click award | Idempotent/rejected duplicate; one Job only | TODO |
| FAIL-02 | Concurrent award requests | Serializable/constraint protection leaves one winner | TODO |
| FAIL-03 | Stale page bids after close | Server rejects bid | ROUTE REGRESSION PASS — marketplace POST and spot POST/PATCH; live negative UAT pending |
| FAIL-04 | Invalid job state transition | Rejected with current state unchanged | CODE REVIEW PASS — transition matrix rejects invalid path |
| FAIL-05 | Repeated completion submission | No duplicate lifecycle event/state corruption | CODE REVIEW PASS — repeated DELIVERED has no valid transition |
| FAIL-06 | Repeated completion confirmation | No duplicate completion/state corruption | ROUTE REGRESSION PASS — COMPLETED repeat returns 409 before writes; browser UAT pending |
| FAIL-07 | Notification creation failure inside transaction-critical operation | Transaction behaviour documented and tested | TODO |
| FAIL-08 | Overlapping active fee rules | Award fails closed rather than selecting arbitrary rule | TODO |
| FAIL-09 | Unsupported fee payer configuration | Award fails closed | TODO |
| FAIL-10 | Existing fee snapshot/idempotency collision | No duplicate fee record | TODO |

## P1 — onboarding, verification and notifications

| ID | Flow | Expected result | Status |
| --- | --- | --- | --- |
| ONB-01 | New company account onboarding | Company/user membership created correctly | TODO |
| ONB-02 | Guest account onboarding | Guest can create guest job without company | TODO |
| ONB-03 | Company verification submit/review | Correct status transitions and permissions | TODO |
| NTF-01 | Marketplace win notification | Correct recipient and deep link | PASSED in prior UAT |
| NTF-02 | Marketplace unsuccessful notification | Only losing bidders notified | TODO |
| NTF-03 | Tender win/unsuccessful notifications | Correct recipients and links | TODO |
| NTF-04 | Opportunity alert matching | Only matching active preferences generate notification | TODO |
| NTF-05 | Read/unread handling | Correct per-user/company state | TODO |

## P2 — production readiness

| ID | Area | Acceptance | Status |
| --- | --- | --- | --- |
| OPS-01 | Environment variables | Production-required vars documented | TODO |
| OPS-02 | DB migration procedure | Safe deploy/migration/rollback procedure documented | TODO |
| OPS-03 | Error logging | Server errors observable without exposing secrets | TODO |
| OPS-04 | Health/readiness | Basic app/database health approach documented or implemented | TODO |
| OPS-05 | Backup/recovery | Neon backup/recovery procedure documented and tested | TODO |
| OPS-06 | Launch rollback | Vercel rollback steps documented | TODO |
| OPS-07 | Admin investigation | Admin can trace company -> award -> Job -> events without DB shell for normal support cases | TODO |

## P2 — performance, accessibility and mobile

| ID | Area | Acceptance | Status |
| --- | --- | --- | --- |
| UX-01 | Mobile marketplace | Core browse/bid/award screens usable on phone | TODO |
| UX-02 | Mobile job lifecycle | All lifecycle actions usable on phone | TODO |
| UX-03 | Keyboard/form labels | Critical forms usable without mouse and have labels/errors | TODO |
| UX-04 | Loading/error feedback | Critical actions do not fail silently | TODO |
| UX-05 | Slow pages | Identify and fix launch-blocking performance regressions only | TODO |

## Exit criteria

Launch hardening is GREEN when all P0 tests pass, no open Severity 1/2 defects remain, P1 failures have an explicit disposition, production rollback/recovery steps exist, and a final two-company end-to-end regression passes on the production-equivalent deployment.

Commercial fee percentage, fee earning trigger, payment provider, invoicing and real charging remain separate approval gates and are not required to complete this hardening matrix unless explicitly approved.

## Route regression evidence — 30 September 2026

Added `lib/security-routes.test.mjs` to `npm test`: 33 tests execute the current TypeScript route handlers and platform-admin guard with synthetic Clerk identities and database rows. Unexpected database operations throw; rejected actions must return before a write. The tests cover award authentication, tenant ownership and staff roles; lifecycle party permissions; private job access; unrelated reviews; guest and spot bid privacy; losing bidder spot detail; notification scope; and platform-admin access.

Guest and spot bidders receive only their own bid/offer. The poster can compare all submissions. Rival prices, company IDs and private notes are checked with sentinel values; losing spot bidders do not receive the winner's job or award metadata.

All 45 individual tests pass (33 route regression + 12 existing fee tests). ESLint on the new test file, TypeScript checking and diff whitespace checks pass. All 11 exercised source files were compared with `spot-requirements` on GitHub and matched exactly. No application routes were changed by this work.

These tests verify handler logic with stubs. They do not prove real Clerk sessions, database transport, browser rendering or concurrent award behaviour. Live negative UAT and concurrent award tests remain pending; the entire P0 matrix is not yet GREEN.

## Bid validation and rejected offer actions — 30 September 2026

Added 33 handler tests: marketplace and spot valid-cent prices, invalid precision, closed windows, own-company rejection, marketplace minimum bid, unsigned spot requests, and company-scoped spot revisions. Both spot POST/PATCH and marketplace POST incorrectly rejected valid values such as 19.99 and 0.29 because multiplying by 100 produced floating-point residue. Regression tests reproduced all six failures before the fix. Validation now checks the canonical numeric decimal representation rather than exact equality after multiplication; nonpositive, nonfinite and excess-precision values remain rejected.

All 78 individual tests pass (66 route + 12 fee), along with ESLint on changed files, TypeScript checking and whitespace checks. These are handler tests with synthetic identities/database stubs. No real database writes or notifications occurred during the automated tests. Live negative UAT and concurrent awards remain pending. Browser display evidence for the isolated spot privacy fixture is in sealed-offer-browser-uat.md.
