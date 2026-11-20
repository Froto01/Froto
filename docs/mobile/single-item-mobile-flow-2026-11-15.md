# Froto mobile single-item experience | design-only extension

**15 November 2026 (Brisbane AEST)** · **Proposal, NOT implemented** · separate iOS/Android mobile workstream · [approved product scope](https://github.com/Froto01/Froto/issues/41) (14 November single-item delivery addition). Extends the [14 November API inventory](./foundation-api-gap-inventory-2026-11-14.md), without changing website code, APIs, tenant access, payments or app configuration. **Original Froto logo** and **supply-chain spot-market** positioning remain unchanged. No native app build, selected framework or store account is implied.

**Evidence:** inspected the existing `app/api/guest-auctions/route.ts`, `app/api/guest-auctions/[id]/bids/route.ts`, `app/api/guest-auctions/[id]/award/route.ts`, and `app/api/guest-auctions/[id]/status/route.ts` at baseline `38627662a93ab6cd7e35a792a46a62de82010904`. These implement a guest create, sealed company bid, owner comparison/conditional award and awarded-company status updates with guest-owner confirmation. They **do not** implement the new proposed screens, media, structured time windows, collection PIN or provider-managed payment. `COLLECTED` is a **proposed customer-facing milestone**, not a claim that the existing status endpoint accepts that action (it currently uses `START`).

## First-release mobile screens and server contract gaps

| Proposed native screen | What user sees | Backend gap / safety boundary |
| --- | --- | --- |
| Customer post | Today or Schedule later **requested** pickup window; store collection point/order-ready; furniture packed/assembled, crew, stairs/lift, carry-in, address, dimensions and photos | Guest create currently accepts free-text locations and optional pickup date, not confirmed pickup windows, structured address/access fields or media. Camera or location denial must allow manual alternatives. |
| Waiting for offers | Distinct `WAITING_FOR_OFFERS`, count and next step even with zero offers | Add canonical mobile state/pagination from server; do not invent availability or courier coverage. |
| Compare and award | Owner-only total payable, pickup window, vehicle/crew, inclusions and eligible courier rating | Existing bid API holds amount/service description and owner rating summary, **not all structured comparison fields**. Providers see **own sealed offer only**. No guest charge at bid submission. |
| Courier offer/award | Private bid and later award notification; agreed pickup window distinguished from request | Provider eligibility, coverage, structured pickup commitment, idempotency receipts and delivery reference after award require design/backend/security review. Do not reveal collection code to other couriers or before award. |
| Courier delivery | One-tap milestone update; PIN for hand-to-recipient **or** photo for agreed safe drop; exception path | Current guest status is `ACCEPT/START/DELIVER` for winner, not evidence upload or PIN verification. Missing PIN, recipient unavailable, failed upload, pickup failure and damage must be reportable and reviewable. |
| Customer confirmation | Reported delivery with proof and **Confirm completion / Report issue** | Guest owner `COMPLETE` is a distinct authority step. Proof by courier alone must never mark payment releasable. |
| Notification/deep link | Authenticated return to the right job; signed-out user signs in and rechecks access | Web notification href is not native push registration, app/universal link validation or a secure recipient access link. Lock-screen text must not expose offers, references or private data. |

The companion [proposed JSON contract](./single-item-mobile-flow.v0.json) and [synthetic static tests](./single-item-mobile-flow.test.mjs) encode explicit screen states, privacy rules, interruption recovery, and deferred work. Future mobile app should use existing authoritative website job/quote/completion records rather than a duplicate ledger or client-side tenant checks. Company switching, Clerk native-session handling, server idempotency, PIN/media authorisation and award/financial concurrency remain **unresolved security/backend gates**, not authorised fixes.

## Interruption and staged-payment boundaries

On timeout after posting or awarding, **fetch authoritative state before any retry**; never blindly resubmit award or charge. Treat 401 as reauthentication, 409 as fresh-state reconciliation and camera/location denial as manual entry. There is **no server idempotency receipt contract confirmed**. A planned provider funding state must remain separate from bid, award, delivery evidence, customer confirmation and fee calculation. Provider and framework selection are **not approved**; no sandbox credentials, live cards, funds capture or release is connected.

**Follow-up, NOT first-release implementation:** expiring/revocable recipient browser progress link after access review, and optional photo-assisted editable listing draft after data/provider review. Continuous GPS and instant dispatch remain later scope. Native camera/maps/push permission and accessibility must eventually be tested on both real device platforms.

## Evidence, rollback and next steps

- **Executed local secret-free design tests:** `node --test docs/mobile/single-item-mobile-flow.test.mjs`, 17 passed / 0 failed / 0 skipped on Node v22.16.0. **Only static JSON assertions** were tested, not npm regression, TypeScript, Playwright, real endpoints, GitHub CI, native builds or payments. Check exact GitHub Actions separately; a preview-comment check does not equal mobile CI.
- **Rollback:** revert these two new flow contract/test files plus this markdown from the existing unmerged mobile DRAFT PR. No applied server changes or migrations.
- **Next 1:** turn the screen-state proposal into a reviewable mock, with Australia DST/manual-permission cases, still unconnected to production.
- **Next 2:** request independent backend/security review for identity/tenant scope, safe delivery proof, server idempotency and sealed-bid privacy before real integration.
- **Next 3:** run a limited TypeScript mobile framework/build spike **after a specific selection decision**; React Native + Expo is currently only an evaluated preference. Apple/Google developer accounts are needed later for signing/distribution, **not now**.

**Owner action: NONE today.** This document is a proposal under existing approved scope, not new owner authorisation, a native application, or a release decision. The PM handoff is [GitHub issue #43](https://github.com/Froto01/Froto/issues/43); it does not post into the separate ChatGPT Project task summary conversation.
