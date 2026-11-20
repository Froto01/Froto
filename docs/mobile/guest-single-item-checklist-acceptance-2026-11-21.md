# Australia-first mobile | Guest single-item draft checklist (21 Nov 2026 AEST)

**Status: design-only proposal in existing DRAFT PR #55, not a native app.** Source of owner-approved scope: [#41](https://github.com/Froto01/Froto/issues/41). Shared milestone log: [#43](https://github.com/Froto01/Froto/issues/43). Preserves the original Froto logo and supply-chain spot-market positioning; no public rebrand. The complete [mobile API-gap inventory](./foundation-api-gap-inventory-2026-11-14.md) and [interruption contract](./guest-mutation-reconciliation-acceptance-2026-11-20.md) remain authoritative proposals for missing native/backend work.

## Source-mapped capabilities and gaps

At baseline `spot-requirements` SHA `38627662a93ab6cd7e35a792a46a62de82010904`:
- **Create:** `POST /api/guest-auctions` accepts guest-only title, itemDescription, free-text pickup/delivery, future auction close and optional date/notes. Photos, dimensions/weight, structured Australian addresses, requested pickup **window**, store order-ready and stairs/lift/carry-in are **not** structured backend fields.
- **Sealed bids:** `POST/GET /api/guest-auctions/[id]/bids` supports company offers and owner comparison; courier sees its own private bid. Company membership is currently often selected via `companies[0]`, not a verified active-company mobile selector. Courier coverage/eligibility, vehicle/crew/inclusions fields and negative tenant tests remain gated.
- **Award:** `POST /api/guest-auctions/[id]/award` uses a conditional single award and fee snapshot, **not** customer funding. Server receipt/idempotency, cross-device concurrency and agreed pickup require separate review.
- **Milestones:** `POST /api/guest-auctions/[id]/status` permits awarded company ACCEPT/START/DELIVER, guest owner COMPLETE. Proposed COLLECTED UI, PIN/photo evidence, exceptions and payment-release authority do not exist yet.
- **Notifications:** `GET/PATCH /api/notifications` exposes web hrefs/in-app receipts, **not** device push, verified app links or a native permission model.
- **Map/camera:** free-text address only; native permission-denied fallback and photo upload/retention still unimplemented. Separate earlier draft tests cover Australian UTC/IANA timezone/DST display.
- **Payments:** sandbox **architecture only** for customer consent, awaiting/funded/failed/refund/dispute/release. No chosen provider, card charge, live escrow, changes to fee/payer rules or credentials.

## This narrow addition

`guest-single-item-checklist.v0.mjs` is an in-memory **UI display checklist only**, paired with `guest-single-item-checklist.test.mjs`. It marks basic existing-API text/UTC timestamp presence separately from **proposed** dimensions, access, crew, store collection point/readiness, furniture packing and requested pickup window details. It explicitly labels pickup as REQUESTED, coverage as unverified, funding disabled and submission unsupported. Camera/location denial yields manual description/address fallback. It emits no input addresses, names, collection codes or photos, and performs no API, authorization, storage, upload, network or payment operation. Passing flags do **not** establish server validation, future closing-time correctness, courier availability or actual agreed pickup.

**Secret-free local test:** `node --check` both .mjs files; `node --test docs/mobile/guest-single-item-checklist.test.mjs` (report actual counts in issue #43 after execution). This is not `npm test`, TypeScript/lint/build/Playwright, native CI, device acceptance or financial testing. The original draft PR remains UNMERGED/UNDEPLOYED.

## Framework and gated next work

**React Native + Expo + TypeScript is a candidate, not chosen/approved.** Flutter+Dart or separate native Swift/Kotlin remain alternatives. A native app would reuse authoritative Next.js/Prisma web records and reviewed pure contracts, **never** duplicate the jobs/payment ledger. Australia, AUD and timezone awareness first; international later. Apple/Google accounts become owner setup only when native signing/distribution/store submission is actually planned.

Next: (1) independent backend/security review of role/tenant membership, sealed offers, mobile Clerk, idempotent write receipts; (2) review a native screen proposal for furniture/store pickup, comparison and proof with safe permission fallback; (3) evaluate framework and real-device prerequisites without secret-bearing integrations. **David action: NONE.** Any change to authorization/security, finance/payer policy, production DB/schema, secrets, app provider, merge, deployment or app-store publication needs separate explicit approval. **Rollback:** remove this documentation and the two pure .mjs files from unmerged draft #55. Reporting to #43 is not cross-chat delivery or approval.
