# Froto mobile | proposed guest handover/evidence UI contract (18 Nov 2026 AEST)

**Workstream:** separate owner-approved Australia-first iOS + Android foundation, [issue #41](https://github.com/Froto01/Froto/issues/41) including its 14 Nov single-item handover addition. **Status: DESIGN-ONLY, DRAFT, NOT INTEGRATED.** [PM tracker #43](https://github.com/Froto01/Froto/issues/43) is reporting, never approval. Preserve the original Froto logo and **supply-chain spot-market** positioning. No public rebrand.

## Actual backend at pinned `spot-requirements` source

Baseline commit `38627662a93ab6cd7e35a792a46a62de82010904`:
- `app/api/guest-auctions/route.ts` creates individual guest jobs with free-text locations and optional dates; structured photo/dimensions/access, address/geocode and requested-vs-agreed pickup **windows** are still missing.
- `app/api/guest-auctions/[id]/bids/route.ts` implements company-member sealed offers and an owner-only offer comparison. It uses the first company membership, not a verified native active-tenant selector. Courier coverage/eligibility and structured vehicle/crew/pickup commitments are not established.
- `app/api/guest-auctions/[id]/award/route.ts` awards one private bid and snapshots a fee; it does **not** capture/hold customer card funds. Request idempotency receipts, race testing and payment/provider state separation remain gated backend work.
- `app/api/guest-auctions/[id]/status/route.ts` accepts winning-company `ACCEPT`, `START`, `DELIVER` and guest-owner `COMPLETE`. **There is no existing `COLLECTED` action, PIN verification, safe-drop media upload, exception record or standalone evidence receipt API.** Completion can mark a fee as EARNED, which is not captured, held or paid money. Driver evidence is not customer approval.
- `app/api/notifications/route.ts` exposes role-scoped web notifications/URLs, not push tokens, native delivery, deep-link validation or mobile SDK integrations. Camera/location/maps/address permissions remain native-app dependencies, with the earlier isolated fallback prototype covering only synthetic UI intent.

## Narrow new draft artifact

- `guest-handover-intent.v0.mjs`: **pure synthetic UI-state helper** mapping courier PIN vs agreed safe-drop photo capture; unsent and unknown-upload states; server-accepted proof; customer review versus courier updates; missing PIN, unavailable recipient, failed pickup/upload and damage; signed-out/403/409/timeout reconciliation. It performs **no API, auth, device, upload, PIN, funds or database action**. Caller-provided roles are synthetic display fixtures, **not** authorization.
- `guest-handover-intent.test.mjs`: 20 dependency-free local Node assertions testing intent/exception display only. All returned intents explicitly set `serverMutationPerformed:false` and `payoutPermitted:false`. No personal contact, PIN, photo or payment payloads are created.
- Local command: `node --test docs/mobile/guest-handover-intent.test.mjs` with `node --check` on both files. These are *isolated prototype tests*, not website npm regressions, real PostgreSQL concurrency, TypeScript/build/Playwright, app CI or iOS/Android native/device UAT.

## Still gated / proposed, not implemented

1. **Backend/security owners:** Review a versioned, authenticated proof-upload and recipient-PIN verification contract including scope, audit/retention, PIN secrecy, revocation, missing recipient/damage escalation, company switching and idempotent receipts. Never rely on this display mock for access control.
2. **Website/mobile shared journey:** Agree canonical milestone mapping: backend currently has `START` then `DELIVER`, while user-facing `COLLECTED` is *proposed*. Customer confirmation must remain independent, and provider-led delivery evidence alone cannot release payment.
3. **Native framework and acceptance:** Evaluate React Native + Expo + TypeScript against Flutter and native Swift/Kotlin. Expo is a **technical candidate, not approved or selected**. Real iOS/Android builds must later test PIN/photo/manual fallback, denial of camera/location/push, AU addresses/timezones, signed-out deep links, off-network retry and web/app record parity.

**Payments:** sandbox funding/failed/held/disputed/released states remain conceptual only. No selected provider, live or sandbox integration, card charging, ledger modification, fee-rule change, release or account setup. Apple/Google developer accounts only needed when code signing/device distribution/store submission is actually scheduled.

**Rollback:** remove these three `docs/mobile`-only additions from existing unmerged mobile [DRAFT PR #55](https://github.com/Froto01/Froto/pull/55). No production change to reverse. **Owner action NOW: NONE.** Existing security, autonomous website, UAT and PM workstreams/schedules untouched.
