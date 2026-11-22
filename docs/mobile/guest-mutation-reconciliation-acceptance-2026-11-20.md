# Froto mobile | Interrupted mutations: source-mapped acceptance (design only)

**Friday 20 November 2026, Brisbane AEST.** Owner-approved product scope [issue #41](https://github.com/Froto01/Froto/issues/41); durable PM record [#43](https://github.com/Froto01/Froto/issues/43). This is a **draft UI-state prototype and synthetic tests**, extending existing [draft mobile PR #55](https://github.com/Froto01/Froto/pull/55). It does **not** implement or modify an endpoint, authorization, payment, persistent offline queue, mobile SDK, app build or production deployment.

**Verified source baseline:** `spot-requirements` full SHA `38627662a93ab6cd7e35a792a46a62de82010904`. The mobile branch contains separate unmerged design prototypes, NOT a mobile app build. Original Froto logo and supply-chain spot-market identity are unchanged.

## Shared website-backend inventory and gap acceptance

| Mobile need | Existing API/source | Missing backend-native contract |
| --- | --- | --- |
| Single-item customer post | `POST /api/guest-auctions` creates a guest-only job from title, free-text item/pickup/delivery, closing time, optional dates/notes | No provable idempotency key or create receipt after timeout; photos, dimensions, access needs, structured Australian addresses/pickup windows and geocoding not represented |
| Courier private offer | `POST/GET /api/guest-auctions/[id]/bids` provides company-member bid and role-differentiated own-vs-customer comparison | No reliable request receipt, verified courier coverage/eligibility, active multi-company selector or approved cross-tenant mobile security matrix |
| Guest compares and awards | `GET .../[id]/bids`, `POST .../[id]/award`; conditional Serializable one-winner award with 409 | No idempotent mobile retry receipt or reconciled customer total/funding confirmation; fee snapshot is not captured cash |
| Courier milestones/customer completion | `POST .../[id]/status`: ACCEPT, START, DELIVER by awarded company; COMPLETE by guest owner | No mobile-safe operation receipt, PIN/photo evidence upload, exception audit, cross-app parity or payment release approval; delivery evidence alone never authorizes release |
| Notifications/deep links | `GET/PATCH /api/notifications` serves web hrefs with scoped read receipts | No device tokens, native push, authenticated universal links, or verified revocation and denial fallbacks |
| Camera/maps/time windows | Free-text locations and optional dates only; proposal in prior #55 permissions prototype | Need permission-safe manual address, camera/gallery fallback, AU IANA timezone-aware requested vs agreed window, real-device accessibility |
| Payment | Existing fee snapshot path on award/completion | **Sandbox DESIGN ONLY**: consent, awaiting provider, funded/failed/disputed/refund/release separately; no provider or live/escrow implementation |

## Ambiguous mutation UI contract

New `guest-mutation-reconciliation.v0.mjs` is a deterministic **display-intent helper**, used only by `guest-mutation-reconciliation.test.mjs`. For CREATE_JOB, SUBMIT_PRIVATE_OFFER, AWARD_OFFER and RECORD_MILESTONE, it always prohibits automatic POST replay. A network timeout, loss or server 5xx leaves the write **unknown**. A server list item resembling a missing job or bid is **not** a proof that this attempt succeeded: the UI needs a reviewed server-issued operation receipt before attribution.

- 401 or signed-out: sign in and fetch authorized state again.
- Switched/unknown viewer or company: discard the previous viewer's private presentation.
- 403, 404 or denied fresh lookup: hide private data and return to the permitted list.
- 409 or confirmed conflict: refresh authoritative state, no automatic repeat.
- HTTP 2xx: request fresh authorized detail before advancing; do not claim money captured.
- Visible fresh record: show **record visible, write unattributed**, not confirmed success.
- Create timeout: require review of the owner's list and assistance before repost; title matching is unsafe.

A UI viewer hint is never an authorization decision, and the helper does not actually perform a GET. No cards, login tokens, PINs, addresses or bid objects are retained by this prototype.

## Framework status, tests and boundaries

**Candidate, NOT approved/selected:** React Native + Expo + TypeScript offers reuse of pure TypeScript types/tests from the existing Next.js project. **Alternatives:** Flutter requires a Dart-facing contract and native Swift/Kotlin increases two-platform maintenance while allowing deeper platform control. None is selected. No Apple/Google developer accounts or native/device builds are verified; accounts become relevant for signing and store distribution, not this draft.

**Test command:** `node --check docs/mobile/guest-mutation-reconciliation.v0.mjs`, `node --check docs/mobile/guest-mutation-reconciliation.test.mjs` and `node --test docs/mobile/guest-mutation-reconciliation.test.mjs`. Results must be reported only if actually executed and verified against committed file hashes. This is NOT npm/web regression, TypeScript, lint, Playwright, iOS or Android CI. No credentials, live provider, schema, migrations, security settings, branches other than #55, build gates or production resources are touched.

**Next three:** (1) independent security/backend reviewer to specify operation receipts and active-company role isolation; (2) extend customer/courier synthetic error and permission matrix without production integration; (3) evaluate a credential-free framework spike before asking the owner to choose. **David action: NONE now.** Rollback: remove only these three docs/mobile files from unmerged draft #55.
