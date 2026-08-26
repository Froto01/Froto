# Froto Transaction Fee Engine Design

**Status:** Design proposal for approval  
**Date:** 26 August 2026  
**Scope:** Success / transaction fee calculation and accounting foundation only. Payment-provider selection, exact fee rates and invoice policy remain explicit approval gates.

## 1. Objective

Build a launch-safe commercial engine that can calculate, snapshot and track Froto's success fee whenever business is awarded through Froto, without coupling the fee logic to any specific payment provider.

The engine must support:

- marketplace listing awards;
- tender awards;
- guest silent-auction awards;
- future promoted-listing charges;
- GST-capable financial records;
- future invoicing, payment and settlement integrations;
- fee minimums, caps and source-specific rules if approved later.

The engine must not assume that every awarded transaction is paid through Froto. Large commercial jobs may be transacted through Froto while settlement happens under external commercial terms.

## 2. Current platform fit

The current `Job` model already gives marketplace and tender awards a durable transaction record containing buyer company, provider company, awarded amount, source references, lifecycle status and job events.

Guest auctions currently remain a separate workflow and do not create a `Job` record. The fee engine therefore needs to support both `Job` and `GuestAuction` as source records at launch rather than forcing a risky guest-workflow refactor merely to introduce fees.

## 3. Core design principle

**Calculate once, snapshot the commercial terms, then track state.**

A historical transaction fee must not silently change because Froto later edits its pricing rules.

Each fee record therefore stores both a reference to the rule/version used and the exact commercial inputs and calculated outputs that applied to that transaction.

## 4. Proposed commercial lifecycle

Recommended technical lifecycle:

**Award → fee record created as PENDING → transaction performed → completion confirmed → fee becomes EARNED → invoice/payment layer handles collection → PAID / WAIVED / REFUNDED as applicable.**

This separates calculation, earning and collection. The exact policy for when the fee becomes legally/commercially earned remains an approval gate. The data model should support award-time or completion-time earning without redesign.

## 5. Proposed data model

### `FeeRule`

Versioned commercial configuration used by the calculation engine.

Suggested fields:

- `id`
- `code`
- `version`
- `sourceType`
- `active`
- `effectiveFrom`
- `effectiveTo` nullable
- `percentageBps` nullable
- `flatFee` nullable
- `minimumFee` nullable
- `maximumFee` nullable
- `payerType`
- `gstMode`
- `metadata` JSON
- timestamps

Money should use Prisma `Decimal`, not floating-point numbers. Percentage rates should use integer basis points. Example: 250 basis points = 2.50%.

### `TransactionFee`

Immutable calculation snapshot plus mutable lifecycle/payment state.

Suggested fields:

- `id`
- `jobId` nullable
- `guestAuctionId` nullable
- `sourceType`
- `sourceId`
- `buyerCompanyId` nullable
- `providerCompanyId`
- `guestUserId` nullable
- `basisAmount`
- `currency` default `AUD`
- `feeRuleId` nullable
- `ruleCodeSnapshot`
- `ruleVersionSnapshot`
- `percentageBpsSnapshot` nullable
- `flatFeeSnapshot` nullable
- `minimumFeeSnapshot` nullable
- `maximumFeeSnapshot` nullable
- `payerTypeSnapshot`
- `feeExGst`
- `gstRateBps`
- `gstAmount`
- `feeInclGst`
- `status` - PENDING, EARNED, WAIVED, VOID, REFUNDED
- `earnedAt` nullable
- `waivedAt` nullable
- `voidedAt` nullable
- `refundedAt` nullable
- `metadata` JSON
- timestamps

Recommended uniqueness: at most one active success-fee record per `Job` and at most one active success-fee record per `GuestAuction`, with idempotent creation so award retries cannot duplicate fees.

Future invoice/payment records should reference `TransactionFee`; they should not replace it.

## 6. Fee calculation service

Create a dedicated domain service such as `lib/commercial/fee-engine.ts`.

Responsibilities:

1. identify the applicable active rule;
2. calculate percentage and/or flat components;
3. apply minimum and maximum bounds;
4. calculate GST according to the approved GST mode;
5. return a deterministic calculation snapshot;
6. never perform payment-provider calls.

The award API should call this service rather than embedding percentages or commercial formulas inside route handlers.

The fee calculation and award should occur inside the same database transaction where practical so an award cannot exist without its corresponding commercial record once fees are enabled.

## 7. Integration points

### Marketplace listing award

Existing job creation is the correct point to create the fee snapshot because the awarded amount and both companies are known.

### Tender award

Use the same `Job`-based path and a source-specific fee rule if approved.

### Guest silent auction

The guest award route currently records the awarded bid directly on `GuestAuction`. Create the fee record against `GuestAuction` without requiring a `Job` migration first.

For a guest transaction, the guest user is the customer side and the awarded company is the service provider. Payer remains configurable by rule. Private competing bid information must never be exposed through fee records or invoices.

### Completion

When the transaction reaches its approved commercial earning trigger, update `TransactionFee.status` to `EARNED` and set `earnedAt`.

### Future invoice/payment layer

The invoice/payment layer reads the frozen `TransactionFee` amount. It must not recalculate historical fees from current pricing rules.

## 8. GST approach

The engine should be technically ready for Australian GST from day one, but the exact customer-facing presentation and tax treatment must be confirmed before production billing.

Recommended storage is explicit: fee excluding GST, GST rate, GST amount and fee including GST.

## 9. Auditability

Every fee should be explainable later: source transaction, awarded value, rule/version, percentage/flat/minimum/cap used, GST calculation, liable party, earning date and later waiver/void/refund/payment state.

Material commercial state changes should create an auditable financial-history entry rather than silently overwriting history.

## 10. Security and privacy

- Never expose competitor bid values through commercial APIs.
- Only transaction counterparties and authorised Froto administrators should see transaction-level fee records.
- Public Market Pulse must not expose Froto's fee charged on an individual transaction.
- Fee-rule administration must be restricted to platform administrators.
- Server-side calculation is authoritative. Never trust a fee amount submitted by the browser.

## 11. Failure and idempotency rules

- repeated award requests must not duplicate a fee;
- retrying completion must not re-earn or duplicate a fee;
- a missing fee rule should fail safely once production charging is enabled rather than silently charging an invented/default percentage;
- historical fee snapshots must remain unchanged when rules are edited later.

## 12. Recommended implementation phases

### Phase A - Foundation

- add versioned `FeeRule` and `TransactionFee` schema;
- implement pure deterministic fee calculator;
- add unit tests covering percentage, flat, minimum, cap and GST arithmetic;
- do not charge money.

### Phase B - Award integration

- create fee snapshot on marketplace award;
- create fee snapshot on tender award;
- create fee snapshot on guest-auction award;
- ensure idempotency and transactional consistency.

### Phase C - Lifecycle integration

- move fee to EARNED at the approved trigger;
- surface read-only commercial record in admin/transaction views;
- add audit events.

### Phase D - Billing/payment integration

Only after separate approval: choose marketplace payment provider, invoice/receipt generation, payment/payout status, refunds/disputes and accounting integrations.

## 13. UAT acceptance criteria

- same transaction always produces the same fee snapshot under the same rule;
- percentage arithmetic is correct to cents;
- minimum fee is enforced correctly;
- maximum/cap is enforced correctly;
- GST arithmetic is correct;
- marketplace, tender and guest awards each create exactly one fee record;
- retries do not duplicate fees;
- changing a rule does not change historical fee records;
- counterparties cannot see unrelated company fee records;
- public marketplace/Market Pulse endpoints expose no transaction-fee detail;
- completion correctly advances fee state according to the approved earning trigger.

## 14. Explicit decision gates before production charging

The following remain deliberately unresolved and must be approved before enabling real fees:

1. exact percentage(s);
2. minimum fee(s);
3. maximum/cap structure;
4. whether rates differ by marketplace, tender, warehouse and guest job;
5. who pays: buyer, provider, split or source-specific policy;
6. whether advertised fee prices are GST-inclusive or GST-exclusive;
7. whether Froto earns the fee at award, acceptance, completion or another defined event;
8. cancellation/refund/dispute treatment;
9. whether any transaction classes are exempt or manually quoted;
10. payment provider and collection method.

## 15. Recommended architecture for approval

Approve the architecture only now:

- versioned fee rules;
- immutable per-transaction fee snapshots;
- Decimal money and basis-point percentages;
- explicit GST components;
- fee calculation independent of payment provider;
- support for both `Job` and `GuestAuction` transaction sources;
- idempotent creation at award;
- separate fee calculation, earning and collection states.

This lets Froto build the commercial foundation safely without prematurely locking pricing or payment-provider choices.
