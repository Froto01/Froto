# Froto Development Bible

**Status:** Living single source of truth  
**Last reconciled:** 25 August 2026  
**Target launch:** 1 January 2027

## 1. Purpose

This document records what Froto is, the product principles, architecture, roadmap, approved decisions, and why those decisions were made. An approved material product, architecture, commercial, privacy, or launch decision is not considered complete until it is recorded here.

## 2. Product vision

**Froto is a spot marketplace for underutilised logistics capacity, helping carriers, owner-drivers, warehouses and customers efficiently match temporary supply with real-time demand.**

Froto is not intended to replace stable contracted logistics, permanent lanes, established customer relationships or the transport-management systems operators already use to run those networks. Its role is to improve utilisation at the edges of those networks: empty and partially empty transport legs, overflow freight, short-term or spare warehouse capacity, urgent/ad-hoc demand and other temporary supply/demand imbalances.

Transport and warehousing are both treated as tradable logistics capacity. Froto's strategic role is the market layer connecting fragmented logistics networks when capacity would otherwise be idle or demand would otherwise go unmatched.

The long-term differentiation is the feedback loop:

**Marketplace activity → transaction → completion → reputation → anonymous market intelligence → better matching and alerts → more marketplace activity.**

## 3. Product principles

1. **Connect. Match. Move.**
2. **Froto is a spot market, not a replacement for stable contracted logistics.**
3. **Free to join. Free to participate. Froto earns when business happens.**
4. Improve utilisation of logistics assets that would otherwise be idle, empty or underused.
5. Build liquidity first; avoid unnecessary barriers for small operators.
6. Trust is part of the transaction: verification, completion records and reputation matter.
7. Public market intelligence must be useful without exposing commercially sensitive individual transactions.
8. Do not fabricate marketplace activity or benchmark data. When data is insufficient, say so.
9. Prefer an agile launch-safe version first, then deepen functionality from real usage.
10. Every new pre-launch feature should materially improve liquidity, trust, transaction completion, market intelligence or launch reliability.
11. Avoid drifting into a general TMS/WMS. Operational features should exist primarily where they enable or protect the marketplace transaction.

## 4. Current architecture

- **Frontend/application:** Next.js App Router, React, TypeScript, Tailwind CSS.
- **Hosting/deployment:** Vercel.
- **Authentication:** Clerk.
- **Database:** Neon Postgres via Prisma.
- **Transactional email:** Resend.
- **Primary website:** frotohub.com.
- **Transactional/alert email domain:** frotoalerts.com.
- **Production alert sender:** Froto Alerts <alerts@frotoalerts.com>.
- **Source control:** GitHub repository `Froto01/Froto`.

Any older documentation referring to Supabase as the active backend is superseded by the architecture above.

The future mobile application should use the same Froto marketplace/backend rather than create a second marketplace or duplicate business logic. The current preferred mobile direction is **React Native with Expo**, subject to technical reassessment when mobile implementation begins.

## 5. Core marketplace capability built

Froto currently includes or has established foundations for transport and warehouse/3PL capacity listings, live marketplace bidding, structured tenders, guest/customer transport jobs using sealed/silent bidding, company onboarding and profiles, verification, reviews/reputation, award/completion workflows, dashboards/history, notifications, opportunity matching/email alerts, safe public marketplace activity and Froto Market Pulse.

## 6. Opportunity alerts

### Launch scope

- Users choose opportunity types and areas/keywords they are interested in.
- Matching new opportunities create in-app notifications.
- Email alerts are sent through Resend when enabled.
- Duplicate delivery is suppressed per user/opportunity.
- Personal/guest users can receive notifications without requiring a company.

### SMS decision

SMS alerts are **deferred until post-launch**. They are expected to become more relevant alongside the future mobile/courier-driver experience, where private contracts and live package/job updates may operate more like an on-demand delivery application.

## 7. Guest silent-auction jobs

A guest/personal user can post a freight job and companies can bid privately. Competing bidders must not see sealed bid amounts. The customer awards based on the available offer and trust/reputation information.

The winning buyer/service provider must provide the required completion evidence/details so the seller/customer can confirm that the work is complete.

Completed and awarded guest jobs must not continue appearing as open marketplace opportunities, but must remain available in the appropriate history/job workflow.

## 8. Trust and reputation

Froto's trust layer includes company verification, reviewer/admin tracking, company notification, verified status/badge and reviews/reputation.

The intended transaction loop is:

**Discover → Bid → Award → Perform → Confirm → Review → Reputation → Market data.**

Trust information should help customers assess counterparties without compromising private commercial information.

## 9. Landing-page live marketplace

The landing page contains a safe public view of real marketplace activity. It may expose broad opportunity information such as type, route/location, capacity/details, timing and activity counts.

It must not expose private customer identities, company identities where not intended for public display, contact information, competing sealed bid amounts, or other commercially sensitive private transaction data.

The larger landing-page board remains the live current-opportunity view.

## 10. Froto Market Pulse

Market Pulse turns completed Froto transactions into anonymous market intelligence and gives users a feel for what the logistics spot market is doing.

Each published benchmark should clearly show **Market / lane or 3PL market**, **Typical rate**, **Rate unit**, **30-day trend**, and **Activity / award count**.

Statistical/privacy rules: use actual awarded/completed transactions rather than asking prices or live sealed bids; use median rates; compare latest 30 days with previous 30 days; require at least 3 comparable transactions at launch; show **“Building market data”** when insufficient; never expose contributing identities or individual prices; increase segmentation only when liquidity/privacy permit.

Initial interpretation: transport uses median awarded shipment value for genuinely comparable transactions, with richer normalised units later; pallet-based warehouse capacity uses median awarded `$/pallet/week` segmented when sufficient data exists.

## 11. Commercial model

**No mandatory subscription for core marketplace participation.** Froto should minimise barriers to entry, especially for smaller carriers, owner-drivers, regional operators and smaller 3PLs.

Primary revenue is a **success / transaction fee** when business is successfully transacted/awarded through Froto. The exact fee schedule is not yet locked and may use different percentages, minimums and/or caps for different transaction sizes/types.

Optional revenue may include featured listings, priority placement, highlighted tenders, urgent freight promotion and featured warehouse capacity. Future optional revenue may include advanced Market Pulse analytics/data, API access, enterprise integrations and premium tender/data tools.

## 12. Payments, billing and invoicing roadmap

Froto needs three related but distinct financial capabilities: a Froto revenue engine, customer-to-customer payment capability, and invoicing/financial records.

Froto should integrate a mature marketplace payment provider rather than build its own payment processor. **Provider selection is currently deferred pending financial-adviser input and must remain provider-neutral until separately approved.**

The commercial engine must remain independent of payment method: large commercial contracts may be awarded through Froto but paid under monthly/off-platform commercial terms rather than through a simple checkout.

The platform roadmap includes tax invoices/receipts, GST records, payment status/history, downloadable transaction records, Froto fee records, refunds/dispute handling design and future accounting/ERP integrations where justified.

Target transaction lifecycle:

**Post → Bid → Award → payment/payment terms → Perform → Confirm → invoice/receipt → payout/settlement → Froto fee → Review → Market Pulse.**

## 13. Future matching and Froto Driver direction

The spot-market thesis does not require every operator to publicly advertise spare capacity. As Froto matures, private availability/matching may allow operators to define preferred lanes, regions, equipment, dates and criteria so Froto can surface matching opportunities without publicly revealing network imbalances or commercially sensitive spare-capacity positions.

### Froto Driver

A dedicated mobile experience is approved as a **planned post-launch product direction**, initially focused on carriers, courier drivers and owner-drivers who need to access the spot market while on the road.

The app should connect to the same Froto marketplace/API/database as the web platform. It should not be a separate marketplace and should not initially attempt to reproduce every desktop feature.

Preferred implementation direction: **React Native + Expo**, giving Froto one mobile codebase for iOS and Android while retaining the React/TypeScript ecosystem. This is a preferred architecture, not an irreversible vendor decision.

### Mobile delivery phases

**Phase 1 — Mobile web / PWA hardening**  
Ensure the core marketplace works exceptionally well on phones and assess installable PWA capability without placing native-app delivery on the January launch critical path.

**Phase 2 — Froto Driver app**  
Focused workflow: driver/provider profile and vehicle/capacity → availability → nearby/relevant opportunity feed → push notification → view opportunity → bid → award → job details → completion → reputation.

**Phase 3 — Intelligent/private matching**  
Allow operators to specify current area, preferred direction/lane, vehicle/equipment, available capacity and availability window. Froto can proactively match suitable opportunities without requiring spare capacity to be publicly disclosed.

**Phase 4 — Live logistics**  
Potential opt-in location-aware matching, live job status, pickup/delivery events, proof of delivery, push/SMS and route-aware courier opportunities. Continuous location tracking must not be assumed; it should be opt-in and introduced only where the user value justifies privacy, battery and operational costs.

### Courier utilisation thesis

A particularly valuable future use case is matching a driver already travelling in approximately the right direction with incremental courier/freight demand. The objective is not simply to find an available driver, but eventually to identify capacity whose existing movement makes the additional job efficient.

Examples include return/backload opportunities after delivery, partially empty vehicles, same-direction courier pickups and short-notice overflow work.

### Launch guardrail

Froto Driver is **not part of the 1 January 2027 critical path by default**. The web marketplace and commercial transaction loop should be completed and hardened first. A lightweight mobile/PWA capability may be brought forward only if doing so does not materially increase launch risk.

## 14. Roadmap status

### Completed / substantially completed

- Core marketplace foundation.
- Real authentication/database foundation.
- Company onboarding/profile flows.
- Bidding and tender foundations.
- Trust/verification foundations.
- Guest silent-auction foundation.
- Opportunity alerts: in-app + email.
- Resend production email-domain setup.
- Safe live landing-page marketplace board.
- Sprint 8 Market Pulse foundation.

### Sprint 9 — Commercial Transactions

Current focus:

- provider-neutral commercial ledger;
- award-to-commercial-transaction wiring;
- financial summary views;
- fee-rule architecture without activating an unapproved fee;
- invoicing/GST/financial-record foundations;
- promoted-listing architecture.

Payment-provider selection remains on hold pending financial-adviser input.

### Post-launch mobile roadmap

- mobile/PWA hardening;
- Froto Driver native app;
- push notifications;
- private availability/capacity matching;
- route/location-aware matching where justified;
- live pickup/delivery/POD workflows;
- SMS integration where mobile use case supports it.

### Pre-launch priority

Protect the **1 January 2027** launch by treating schedule lead as contingency rather than filling it indiscriminately with scope. Reliability and a clean end-to-end transaction loop take precedence over non-essential features.

## 15. Decision log

### D-001 — Marketplace direction
**Decision:** Froto is a bidding-oriented logistics capacity marketplace spanning transport and warehousing, rather than a conventional e-commerce storefront.  
**Reason:** Logistics capacity is time-sensitive, variable and naturally suited to discovery, competition and award.  
**Impact:** Listings, bidding, tenders, awards and transaction workflows are core platform primitives.

### D-002 — Transport + warehouse capacity
**Decision:** Treat warehouse/3PL capacity as tradable marketplace capacity alongside freight capacity.  
**Reason:** Unused pallet/storage capacity has the same marketplace opportunity characteristics as spare transport capacity.  
**Impact:** Froto differentiates beyond freight-only load boards.

### D-003 — Guest silent auctions
**Decision:** Allow personal/guest users to post freight jobs with private/sealed company bidding.  
**Reason:** Opens Froto to one-off freight demand while protecting bidder pricing and letting reputation influence award decisions.  
**Impact:** Guest jobs, sealed bids, customer award flow and completion confirmation are part of the platform.

### D-004 — Opportunity alerts
**Decision:** Users can save opportunity interests and receive matching in-app and email alerts.  
**Reason:** Marketplace value increases when relevant supply/demand is proactively surfaced instead of relying only on manual browsing.  
**Impact:** Saved alert preferences, matching logic, notifications and transactional email are core features.

### D-005 — SMS deferred
**Decision:** SMS alerts are post-launch rather than launch scope.  
**Reason:** Email + in-app alerts provide launch value without adding unnecessary communications complexity; SMS becomes more valuable with the future live courier/app workflow.  
**Impact:** Launch communications are in-app + email.

### D-006 — Dedicated transactional email domain
**Decision:** Use `frotoalerts.com` for Froto transactional/alert email while keeping `frotohub.com` as the website domain.  
**Reason:** Avoid disruption to the working website/DNS setup and obtain reliable DNS control for Resend authentication.  
**Impact:** Production sender is `Froto Alerts <alerts@frotoalerts.com>`.

### D-007 — Public live marketplace activity
**Decision:** Show real marketplace activity on the landing page using a privacy-safe public feed.  
**Reason:** Demonstrates genuine marketplace activity and avoids static/demo-only presentation.  
**Impact:** Public feed must exclude sensitive identity and sealed pricing data.

### D-008 — Market Pulse
**Decision:** Replace the duplicate landing-page marketplace panel with Froto Market Pulse.  
**Reason:** A second identical activity board adds less value than transaction-derived market intelligence.  
**Impact:** Landing page shows both current opportunity liquidity and historical market/rate signals.

### D-009 — Market Pulse methodology
**Decision:** Use completed/awarded transactions, median rates, 30-day trend, activity counts and minimum sample thresholds.  
**Reason:** Advertised prices and live sealed bids can misrepresent the true market; medians are more resistant to outliers and minimum samples improve privacy/credibility.  
**Impact:** Insufficient markets show “Building market data”.

### D-010 — No mandatory marketplace subscription
**Decision:** Core Froto participation will not require a mandatory subscription at launch.  
**Reason:** Subscription fees can discourage smaller operators and slow marketplace liquidity.  
**Impact:** Basic joining, participation and marketplace access should remain low-friction.

### D-011 — Success-based monetisation
**Decision:** Froto's primary marketplace revenue will be a success/transaction fee when business happens.  
**Reason:** Aligns Froto revenue with customer value created and makes adoption easier.  
**Impact:** A transaction-fee engine and robust award/financial records are required.

### D-012 — Promoted listings
**Decision:** Offer optional paid promotion rather than requiring payment for ordinary marketplace participation.  
**Reason:** Creates incremental revenue without restricting liquidity.  
**Impact:** Featured/priority/urgent promotion becomes part of the commercial roadmap.

### D-013 — Payments and invoicing are core roadmap
**Decision:** Add customer payment capability, Froto fee collection/accounting and invoicing/financial records to the core roadmap.  
**Reason:** A mature marketplace needs to close the commercial transaction loop, not stop at award.  
**Impact:** Payment-provider assessment, fee rules, GST/invoicing, settlement and dispute/refund design are required.

### D-014 — Do not build a payment processor
**Decision:** Integrate an established marketplace payment provider rather than creating Froto's own payment-processing infrastructure.  
**Reason:** Security, compliance, payment methods, payouts and operational risk are better handled by specialist infrastructure.  
**Impact:** Provider selection will be assessed against Australian marketplace requirements before implementation.

### D-015 — Bible governance
**Decision:** The Froto Development Bible is the single source of truth for material product decisions and their rationale.  
**Reason:** Development is moving quickly and decisions must remain recoverable without relying on chat history.  
**Impact:** Material approved decisions must be added to this document as part of completing the decision.

### D-016 — Spot-market strategic definition
**Decision:** Adopt the strategic definition: **“Froto is a spot marketplace for underutilised logistics capacity, helping carriers, owner-drivers, warehouses and customers efficiently match temporary supply with real-time demand.”**  
**Reason:** Froto's primary value is improving utilisation of temporary excess capacity and unmet demand, not replacing stable freight contracts or existing transport-management workflows.  
**Impact:** Product positioning, roadmap prioritisation and future feature assessment should reinforce the logistics spot-market role.

### D-017 — Stable contracted work is not the target for displacement
**Decision:** Froto will complement rather than attempt to replace permanent lanes, stable contracted freight, long-term warehouse customers and established operational systems.  
**Reason:** Contract logistics values certainty and existing relationships; Froto creates greatest incremental value where networks are temporarily imbalanced.  
**Impact:** Success should increasingly be assessed through utilisation and spot-market liquidity, not by trying to migrate all logistics activity onto Froto.

### D-018 — Avoid TMS/WMS scope drift
**Decision:** Froto should not become a general-purpose TMS or WMS unless a capability is necessary to enable, complete or protect a marketplace transaction.  
**Reason:** Existing mature products already solve internal freight-management problems; Froto's differentiation is the cross-network market layer.  
**Impact:** Future features must pass a marketplace-value test before entering the core roadmap.

### D-019 — Payment-provider decision deferred
**Decision:** Keep payment architecture provider-neutral until financial-adviser input is received and a provider is separately approved.  
**Reason:** Payment structure affects fees, settlement, tax/accounting and legal responsibilities and should not be locked prematurely.  
**Impact:** Sprint 9 may build provider-neutral ledger, fee, invoice and promotion foundations but must not integrate a provider SDK or production payment flow yet.

### D-020 — Froto Driver mobile product
**Decision:** Develop a dedicated **Froto Driver** mobile experience as a planned post-launch product, initially focused on owner-drivers, courier drivers and mobile transport providers rather than recreating the entire desktop product.  
**Reason:** Mobile creates the greatest incremental value for people controlling moving capacity who need to discover and act on spot opportunities while away from a desk.  
**Impact:** The future mobile roadmap prioritises availability, opportunity matching, push alerts, bidding, award/job workflow, completion and reputation.

### D-021 — Shared marketplace architecture for mobile
**Decision:** Froto Driver should use the same Froto backend, identities, jobs, transactions and marketplace data as the web application. React Native + Expo is the current preferred implementation direction for iOS/Android.  
**Reason:** One marketplace/source of truth avoids duplicated business logic and allows desktop-posted demand to reach mobile providers immediately.  
**Impact:** Web/API architecture should remain reusable by future mobile clients; mobile technology can be reassessed before implementation if needed.

### D-022 — Mobile launch sequencing
**Decision:** Native Froto Driver is not on the January 2027 critical path by default. Mobile web/PWA quality comes first; native app, intelligent matching and live/location features follow in phases.  
**Reason:** The core web spot market and commercial transaction loop need to be reliable before adding the operational and privacy complexity of native mobile/location services.  
**Impact:** Mobile can be accelerated only if it does not materially increase launch risk.

### D-023 — Location and private capacity matching
**Decision:** Future matching should support private, preference-based availability and opt-in location/route intelligence rather than requiring operators to publicly expose spare capacity or continuously broadcast location.  
**Reason:** This preserves commercial privacy and makes Froto more useful to larger networks while still allowing owner-drivers to receive highly relevant work.  
**Impact:** Future matching may use area, direction, equipment, capacity, timing and opt-in location to identify efficient incremental jobs.

## 16. Open decisions requiring future approval

The following are deliberately **not yet locked**:

- exact Froto transaction fee percentage(s);
- minimum/maximum/capped fee structure;
- whether fees differ by transport, guest job, warehouse and tender type;
- selected marketplace payment provider, pending financial-adviser input;
- exact payment timing/escrow-like or direct settlement model, subject to legal/provider constraints;
- refund and dispute policy;
- promoted-listing prices;
- advanced Market Pulse/data pricing;
- final native-mobile framework/provider choices at implementation time;
- detailed privacy/retention rules for future location data.

These should be decided with commercial modelling and implementation evidence rather than guessed prematurely.

---

**Governance rule:** When a material decision changes, update the relevant section and add/supersede a Decision Log entry so Froto retains both the current rule and the reason behind it.
