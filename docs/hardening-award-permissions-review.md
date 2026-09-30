# Award permission hardening review

## Marketplace listing award

Code review result: PASS for authentication, company ownership, award role, listing state, closed-bidding requirement, bid ownership, duplicate-award guard, and serializable transaction protection.

Roles allowed to award: OWNER, ADMIN, MANAGER.

The endpoint rejects users outside the listing company and rejects bids that do not belong to the listing.

## Tender award

Code review result: PASS for authentication, company ownership, award role, tender state, closed response window, and response ownership.

Roles allowed to award: OWNER, ADMIN, MANAGER.

Current code review (30 September 2026): tender state and response eligibility are read inside a Serializable transaction. A conditional updateMany guards the award state, and Prisma P2034 conflicts are handled. This supersedes the earlier finding that tender state was read only before an ordinary write transaction.

Disposition: the code now contains concurrency protection. Concurrent and repeated award requests still require runtime testing; do not mark FAIL-02 or TND-04 passed from code inspection alone.

## Permission regression coverage — 30 September 2026

The actual marketplace, tender and spot award handlers reject unauthenticated users, foreign company owners and STAFF users in automated route tests before mutation. These use synthetic Clerk identities and database stubs; signed-in browser negative UAT remains pending. The route suite also covers job lifecycle permissions, private job access, bid privacy, reviews, notifications and the platform-admin guard. See the launch regression matrix for scope and limitations.
