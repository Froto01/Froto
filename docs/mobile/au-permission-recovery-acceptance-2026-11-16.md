# Froto mobile | AU pickup-time and interruption/permission prototype (16 Nov 2026 AEST)

**Workstream:** separate Australia-first iOS + Android foundation. **Authority:** [approved issue #41](https://github.com/Froto01/Froto/issues/41), including the 14 November single-item addition. **Evidence baseline:** `spot-requirements` `38627662a93ab6cd7e35a792a46a62de82010904`, with [PM tracker #43](https://github.com/Froto01/Froto/issues/43) used for status, never new approval. **Status:** PROPOSED, DRAFT, NOT INTEGRATED with the website or native app. This does not modify the original Froto logo or supply-chain spot-market identity.

## Small safe artifact

- `au-permissions-recovery-prototype.v0.mjs` is a dependency-free UI-state *demonstrator*, not an application module or API endpoint. It does **not** call SDKs, request permissions, access auth, contact a server, read/write a database or handle payments.
- `au-permissions-recovery-prototype.test.mjs` checks Australian IANA timezone presentation (Brisbane AEST versus Sydney AEDT and Perth AWST), Sydney spring/fall DST boundaries, rejected ambiguous/malformed times, requested versus server-confirmed labels, camera/location/push-denied fallbacks, HTTP 401/409 and unknown network outcome reconciliation. These are **synthetic checks of prototype behaviour**, not backend or native integration tests.
- Run locally without credentials: `node --test docs/mobile/au-permissions-recovery-prototype.test.mjs`. This separate prototype is not wired into `npm test`, a CI workflow, any mobile application or production.
- **All pickup times are UTC ISO instants with an explicit Australian IANA display timezone.** Requested pickup times remain unconfirmed. Only an explicitly server-reconciled award fixture can display `AGREED_PICKUP_WINDOW`. Actual backend confirmation and timezone validity remain separately gated.
- Camera denied/unavailable ⇒ manual item description or gallery option; location denied ⇒ manual address entry; notifications denied ⇒ in-app inbox/manual refresh. Native OS permission rationale/capability handling has **not** been built.
- Ambiguous post, offer, award or milestone result ⇒ fetch the **authorised** server record before asking the user about any retry; never silently duplicate award. This is a design rule, **not** implemented server idempotency, access control or replay protection.

## Grounded existing backend vs gaps

| Existing web route at pinned SHA | Observed behaviour | Mobile prerequisite still missing |
| --- | --- | --- |
| `POST /api/guest-auctions` | Individual guest, no company membership; title, item description, free-text pickup/delivery, closing time, optional dates/notes | Structured window + timezone, dimensions, access requirements, safe media upload, stable mobile retry receipts |
| `POST /api/guest-auctions/[id]/bids`; `GET .../bids` | Company bidder; owner sees offer comparison, company sees own offer | Courier eligibility and coverage, mobile-friendly offer details, server-side tenant/membership review |
| `POST /api/guest-auctions/[id]/award` | Owner-only award transaction and fee snapshot | Verified end-to-end idempotency/ambiguous-response handling, no payment activation |
| `POST /api/guest-auctions/[id]/status` | Winner ACCEPT/START/DELIVER, customer COMPLETE | PIN/photo evidence storage, exception handling, independent authorised completion/release gate |
| Notifications linked to guest job | Web notification records exist | Push delivery, safe deep-link routing, permissions/opt-out and device registration (not implemented) |

## Framework comparison, not a selection

**React Native + Expo + TypeScript** may reuse TypeScript validation/types and accelerate a shared iOS/Android UI, but it does **not** allow reusing the Next.js web UI unchanged and native camera/push, Clerk integration and store builds require evaluation. **Flutter** offers a strong cross-platform UI but introduces Dart duplication and different mobile integration costs. **Separate Swift/Kotlin** provides maximal platform control at a larger double-maintenance cost. **No framework is approved or selected; no native app or store account/build has been verified.**

## Gated follow-up acceptance

The security/website/backend owners must separately review Clerk native-session semantics, company selection, tenant-specific records, private offers, server idempotency, evidence privacy, notification deep-link authorisation, upload/storage/retention and payment-provider state transitions. Provider/sandbox flow remains a **design dependency only**, disabled and not tested. Real devices must verify iOS and Android screen readers, denied permissions, offline return, timezones, background/foreground resumption and both app/web state parity. No live email, MFA, provider funds, courier tracking or public homepage rebrand is included.

**Owner action now:** NONE. Apple/Google developer accounts are needed for signing/device distribution/store submission later, not to review these static prototype files. **No merge, deployment, production DB, auth/security policy or financial change is authorised by this documentation.**
