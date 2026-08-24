# Froto Development Bible

**Status:** Living single source of truth  
**Last reconciled:** 24 August 2026  
**Target launch:** 1 January 2027

## 1. Purpose

This document records what Froto is, the product principles, architecture, roadmap, approved decisions, and why those decisions were made. An approved material product, architecture, commercial, privacy, or launch decision is not considered complete until it is recorded here.

## 2. Product vision

Froto is a live logistics capacity marketplace and price-discovery network. It connects shippers, carriers, owner-drivers, 3PL warehouses and other logistics participants so transport capacity, warehouse capacity, tenders and customer freight jobs can be discovered, competitively bid, awarded and completed in one workflow.

The long-term differentiation is the feedback loop:

**Marketplace activity → transaction → completion → reputation → anonymous market intelligence → better matching and alerts → more marketplace activity.**

Froto is broader than a freight quote board: transport and warehousing are both treated as tradable logistics capacity.

## 3. Product principles

1. **Connect. Match. Move.**
2. **Free to join. Free to participate. Froto earns when business happens.**
3. Build liquidity first; avoid unnecessary barriers for small operators.
4. Trust is part of the transaction: verification, completion records and reputation matter.
5. Public market intelligence must be useful without exposing commercially sensitive individual transactions.
6. Do not fabricate marketplace activity or benchmark data. When data is insufficient, say so.
7. Prefer an agile launch-safe version first, then deepen functionality from real usage.
8. Every new pre-launch feature should materially improve liquidity, trust, transaction completion, market intelligence or launch reliability.

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

## 5. Core marketplace capability built

Froto currently includes or has established foundations for:

- transport capacity listings;
- warehouse / 3PL capacity listings;
- live marketplace bidding;
- structured tenders;
- guest/customer transport jobs using sealed/silent bidding;
- company onboarding and profiles;
- company verification workflow;
- reviews/reputation and trust-layer foundations;
- award and transaction workflow;
- completion confirmation workflow;
- dashboards and transaction history;
- in-app notifications;
- saved opportunity alert preferences;
- opportunity matching;
- real transactional opportunity emails;
- safe public landing-page marketplace activity;
- Froto Market Pulse market-intelligence foundation.

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

It must not expose:

- private customer identities;
- company identities where not intended for public display;
- contact information;
- competing sealed bid amounts;
- other commercially sensitive private transaction data.

The larger landing-page board remains the live current-opportunity view.

## 10. Froto Market Pulse

### Purpose

Market Pulse turns completed Froto transactions into anonymous market intelligence and gives users a feel for what the logistics market is doing.

### Target presentation

Each published benchmark should clearly show:

- **Market / lane or 3PL market**;
- **Typical rate**;
- **Rate unit**;
- **30-day trend**;
- **Activity / award count**.

Examples of units include `$/shipment`, `$/pallet`, and `$/pallet/week`. Future structured data may support `$/km` and `$/pallet-km`.

### Statistical and privacy rules

- Use actual awarded/completed transactions, not advertised asking prices.
- Do not derive public benchmarks from competing live sealed bids.
- Use **median** awarded rates rather than simple averages to reduce distortion from outliers.
- Initial window: latest 30 days compared with previous 30 days for trend.
- Require a minimum comparable sample before publishing a benchmark. Launch target: at least 3 comparable transactions, with the threshold capable of increasing as liquidity grows.
- If the sample is insufficient, display **“Building market data”** rather than inventing or over-interpreting a rate.
- Never expose the identity or individual commercial price of a contributing transaction.
- Increase segmentation (temperature, equipment, load size, region, etc.) only when sample size remains sufficient and privacy is protected.

### Initial benchmark interpretation

- Transport: median awarded shipment value for genuinely comparable transport transactions; richer normalised units to follow as structured data supports them.
- Pallet-based warehouse capacity: median awarded `$/pallet/week`, segmented by storage type/market when sufficient data exists.

## 11. Commercial model

### Approved launch principle

**No mandatory subscription for core marketplace participation.**

Froto should minimise barriers to entry, especially for smaller carriers, owner-drivers, regional operators and smaller 3PLs.

### Primary revenue

**Success / transaction fee:** Froto earns a fee when business is successfully transacted/awarded through the marketplace.

The exact fee schedule is not yet locked. It should be modelled before implementation and may use different percentages, minimums and/or caps for different transaction sizes/types. A small freight job and a large annual 3PL contract should not automatically be treated identically.

### Optional revenue

Promoted marketplace products may include:

- featured listings;
- priority placement;
- highlighted tenders;
- urgent freight promotion;
- featured warehouse capacity.

Future optional revenue may include advanced Market Pulse analytics/data, API access, enterprise integrations and premium tender/data tools. These must not create an unnecessary barrier to basic marketplace participation.

## 12. Payments, billing and invoicing roadmap

Froto needs three related but distinct financial capabilities:

### A. Froto revenue engine

- calculate success/transaction fees;
- calculate promoted-listing charges;
- record Froto revenue and GST treatment;
- support sensible fee minimums/caps/rules once commercially approved.

### B. Customer-to-customer payment capability

Froto should integrate a mature marketplace payment provider rather than build its own payment processor. The eventual architecture should support customer payment, payment status and service-provider payout where appropriate.

The commercial engine must remain independent of payment method: large commercial contracts may be awarded through Froto but paid under monthly/off-platform commercial terms rather than through a simple checkout.

### C. Invoicing and financial records

The platform roadmap includes:

- tax invoices/receipts;
- GST records;
- payment status/history;
- downloadable transaction records;
- Froto fee records;
- refunds/dispute handling design;
- future accounting/ERP integrations where justified.

Target transaction lifecycle:

**Post → Bid → Award → payment/payment terms → Perform → Confirm → invoice/receipt → payout/settlement → Froto fee → Review → Market Pulse.**

## 13. Future mobile/private-contract direction

Post-launch, Froto may introduce a mobile/app experience supporting private contracts and live courier/package updates, conceptually similar to real-time driver/job status applications but designed for Froto logistics workflows.

SMS/push/live-location style notifications belong with this phase rather than the initial web launch unless launch evidence changes the priority.

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

### Sprint 8 — Market Intelligence

Current focus:

- Froto Market Pulse;
- benchmark correctness and privacy;
- Market Pulse UAT;
- landing-page polish;
- regression testing;
- merge only after clean UAT.

### Next major commercial/transaction work

After Sprint 8 hardening, prioritise design and implementation planning for:

- success/transaction fee engine;
- marketplace customer payments;
- invoicing/GST/financial records;
- promoted listings.

The exact payment provider and fee schedule require explicit commercial/technical assessment before implementation.

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

## 16. Open decisions requiring future approval

The following are deliberately **not yet locked**:

- exact Froto transaction fee percentage(s);
- minimum/maximum/capped fee structure;
- whether fees differ by transport, guest job, warehouse and tender type;
- selected marketplace payment provider;
- exact payment timing/escrow-like or direct settlement model, subject to legal/provider constraints;
- refund and dispute policy;
- promoted-listing prices;
- advanced Market Pulse/data pricing;
- detailed post-launch app/private-contract architecture.

These should be decided with commercial modelling and implementation evidence rather than guessed prematurely.

---

**Governance rule:** When a material decision changes, update the relevant section and add/supersede a Decision Log entry so Froto retains both the current rule and the reason behind it.
