# Award permission hardening review

## Marketplace listing award

Code review result: PASS for authentication, company ownership, award role, listing state, closed-bidding requirement, bid ownership, duplicate-award guard, and serializable transaction protection.

Roles allowed to award: OWNER, ADMIN, MANAGER.

The endpoint rejects users outside the listing company and rejects bids that do not belong to the listing.

## Tender award

Code review result: PASS for authentication, company ownership, award role, tender state, closed response window, and response ownership.

Roles allowed to award: OWNER, ADMIN, MANAGER.

Concurrency finding: the tender and its awarded state are read before entering the write transaction. The subsequent transaction does not re-read/re-check the tender state and does not request serializable isolation. Two near-simultaneous award requests could therefore both pass the pre-transaction guard and attempt to create separate Jobs.

Disposition: treat tender concurrent/double-award protection as an open launch-hardening defect until fixed and runtime-tested.
