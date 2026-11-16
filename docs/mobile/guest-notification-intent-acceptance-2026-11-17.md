# Froto mobile | Guest notification and deep-link intent prototype

**17 November 2026 Brisbane AEST.** OWNER-APPROVED scope: [issue #41](https://github.com/Froto01/Froto/issues/41), Australia-first customer/courier app, original logo and supply-chain spot-market identity retained. **Status: DRAFT design prototype, not native app, backend authorization, push integration or approved framework.** Existing [PM tracker #43](https://github.com/Froto01/Froto/issues/43) contains evidence, not merge or security approval.

## Source-grounded issue and limited prototype

At pinned baseline `spot-requirements` SHA `38627662a93ab6cd7e35a792a46a62de82010904`:

- `app/api/notifications/route.ts` returns role-scoped web `href`, notification title/message and receipts but is **not** device-push delivery. Scope currently selects `viewer.companies[0]`, so multi-company selection needs independent review.
- `app/api/guest-auctions/[id]/route.ts` returns `viewerType` of `GUEST_OWNER` or `COMPANY_BIDDER` and limited `ownBid`. Its company membership/access handling is a **security review prerequisite**; a `200` response must not be interpreted as proof of all desired tenant-isolation properties.
- `app/api/guest-auctions/[id]/bids/route.ts` exposes bid comparison only to the guest owner, not rival couriers. The prototype keeps comparison UI hidden from the company mode; the server remains the only real privacy boundary.
- Web guest detail links use `/platform/guest-auctions/[id]`. This example recognizes **only** that pattern and otherwise shows the in-app inbox.

New **docs/mobile-only** files: `guest-notification-intent.v0.mjs` and `guest-notification-intent.test.mjs`. The pure demonstrator rejects untrusted external/encoded/parameterized links, uses generic lock-screen text, and requires a **fresh authenticated server detail response** before planning any job-detail screen. On 401 it signs in/refetches; 403/404 goes to inbox; unexpected/mismatched response fails closed. Company bidder receives an **own-detail** view; only the guest owner can request bid comparison. It does **not** make API calls or implement any access checks, and test fixtures are synthetic. Deep-link payloads must never supply `serverDetail`.

## Actual local test / limits

`node --test docs/mobile/guest-notification-intent.test.mjs` (Node v22.16.0) **21 passed, 0 failed, 0 skipped** in a credential-free local copy of the exact new files before commit. These are tests of a **proposed pure UI routing helper**, not authenticated API, mobile operating systems, push, notification receipts, login, company isolation, job-state agreement or device builds. No npm/TypeScript/build/Playwright or GitHub Actions result is implied by this local command. New files are not linked to application code or workflow.

**Release gates:** safe Android/iOS app and universal links, signed-out cold start and auth return, Clerk mobile sessions, active company context, tenant permissions, revocation after notification, device token register/unregister, push dedup/opt-out, permission denial, APNs/FCM/EAS provider choice and OS notification delivery require separate implementation and real-device tests. Do not expose job details, addresses, PIN, payment information or private offers in notification previews. No provider choice, SDK, app/store build, credentials, production DB, fee changes or live payments included. React Native + Expo + TypeScript remains a **candidate**, not an approved framework.

**Rollback:** remove these three docs/mobile files from the **unmerged** mobile PR #55. **David action:** NONE now. Apple and Google developer accounts become actionable only at signing/distribution. The website, security, UAT, autonomous and PM schedules remain untouched.

## Next three

1. Obtain independent backend/security review of mobile identity/active company selection, sealed bids and authoritative deep-link lookup.
2. Extend design-only customer/courier screens for notifications, job completion evidence and denied-permission/offline cases without backend changes.
3. Compare React Native/Expo, Flutter and native build/signing constraints, then seek an explicit framework decision before a native build spike.
