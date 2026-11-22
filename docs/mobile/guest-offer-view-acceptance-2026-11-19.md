# Froto mobile foundation | Private-offer comparison screen contract

**19 November 2026, Brisbane AEST. STATUS: DRAFT, SYNTHETIC UI PROJECTION ONLY.** Scope: approved [issue #41](https://github.com/Froto01/Froto/issues/41), Australia-first customer/courier app. Durable reporting: [issue #43](https://github.com/Froto01/Froto/issues/43). No framework has been chosen or native apps built.

## Source and role evidence

Pinned **website baseline `spot-requirements`**: `38627662a93ab6cd7e35a792a46a62de82010904`. `app/api/guest-auctions/[id]/bids/route.ts` returns `GET` `viewerType: GUEST_OWNER`, `privacy: OWNER_CAN_COMPARE_ALL`, `bids` with amount, free-text `leadTime`, service description and company/rating metadata to the posting customer. It returns `viewerType: COMPANY_BIDDER`, `privacy: SEALED`, `ownBid` only to the company member. These are **server-provided view labels**, not client authorisation. The implementation currently uses `user.companies[0]` for company selection; active-tenant permission handling needs **independent security review**. No native token acceptance is established.

The current bid API **does not** supply reliable structured agreed pickup windows, vehicle, crew, inclusions or a reconciled all-in **customer total payable**. It returns an amount for the private bid, which is *not* evidence of customer charging, platform fee earned or provider payout. Do not invent those fields, assume a lead-time string equals a confirmed appointment, or present a missing rating as zero. The list is not documented as complete/paginated, so do not claim exhaustive courier coverage. Client display logic cannot substitute for server-side tenant/owner isolation.

## DRAFT deliverable

- `guest-offer-view.v0.mjs` is a pure `projectGuestOffers({httpStatus,payload})` **display-intent example** for iOS/Android design reviews, not production UI. Owner-only comparisons display currently evidenced fields; company mode displays **own** bid only, ignoring unrelated objects. Empty owner list explicitly shows waiting for offers.
- Synthetic 401 requires sign-in/fresh fetch; 403/404 clear displayed data; 409 requests refresh; an unconfirmed/invalid response shows no private offer data. Conflicting privacy markers, rival offer arrays in company payload and malformed amounts fail closed. **No actual auth/session validation, server request, network retry or authorization policy change occurs in this helper.**
- `backendMissingFields` explicitly records fields to add only after cross-stream API/security review. No fees, payer policy, payment, charge, refund, award or completion mutation is supported by this example.
- Retain original Froto logo and **supply chain spot market** brand. No public rebrand or external provider is introduced. This file is independent of the website autonomous worker, security remediation, UAT and PM schedules.

## Safe synthetic test and acceptance boundary

Local validation command: `node --check docs/mobile/guest-offer-view.v0.mjs && node --check docs/mobile/guest-offer-view.test.mjs && node --test docs/mobile/guest-offer-view.test.mjs`. The accompanying tests assert sealed comparison, denied session, no false customer-total/charged state and unknown metadata. **These tests cannot prove backend privacy, React Native/Expo, Flutter, iOS/Android devices or mobile build success.** Record exact actual test results in issue #43 after execution and commit verification; do not claim GitHub Actions if no exact-SHA run exists.

## Remaining architecture decisions and test gates

1. **Backend/security**: confirm tenant selection (including multi-company users), guest ownership and private bid authorization with real role-isolation negative tests; review native Clerk sessions without changing existing policy in this draft.
2. **API product contract**: design, review and approve typed structured pickup window, vehicle/crew/inclusions, total payable and pagination; reconcile changed states and ambiguous retries against authoritative server IDs. AU timezone/permission and handover design in prior #55 files still applies.
3. **Mobile architecture**: evaluate React Native + Expo + TypeScript (candidate, **not approved**), Flutter and native alternatives in a safe device-less spike before framework selection. Later Apple/Google developer accounts, signing, permission/notification setup and physical devices require separate readiness gates. Payment state remains **sandbox-design-only, NOT enabled**.

**Rollback:** remove these three `docs/mobile/` files from unmerged draft PR #55. **Owner action: NONE at this milestone**; no merge, deploy, security/finance approval or developer-account purchase requested.
