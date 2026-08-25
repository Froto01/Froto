# Sprint 9 — Commercial Transaction Architecture

**Status:** Architecture baseline for implementation  
**Principle:** Free to join. Free to participate. Froto earns when business happens.

## Current decision hold

**Payment-provider selection is deliberately deferred pending advice from the product owner's financial adviser.** Stripe Connect and Airwallex may remain candidates for later assessment, but neither is approved, selected, or to be integrated yet.

Until that advice is received, Sprint 9 may continue with provider-neutral work only: mapping the current transaction model, designing the commercial ledger, modelling fee scenarios, payment statuses, invoicing requirements and promoted-listing structure. No provider-specific SDK, account setup, production payment flow or irreversible schema dependency should be introduced.

## Goal

Close the commercial transaction loop without creating a subscription barrier or prematurely locking Froto into one fee percentage or settlement method.

## Financial layers

### 1. Froto commercial engine

The platform must be able to calculate and record charges independently of how money is ultimately settled.

Initial charge types:
- success / transaction fee;
- promoted listing fee;
- future premium data / enterprise charges.

Every charge record should retain the rule/version used at the time so historical transactions remain auditable when pricing changes later.

### 2. Customer payment capability

Use an established marketplace payment provider rather than building payment processing ourselves.

The integration must support the Australian market and be assessed for:
- marketplace/platform payments;
- connected seller/service-provider onboarding;
- card and suitable bank-payment methods;
- split/platform fee capability where appropriate;
- payouts/settlement status;
- refunds and disputes;
- webhook/event reliability;
- GST/tax record compatibility;
- identity/KYC requirements imposed by the provider;
- fees and suitability for small jobs as well as larger B2B transactions.

Provider selection is an explicit decision gate and is currently on hold pending financial-adviser input.

### 3. Invoicing and financial records

Froto needs a financial ledger sufficient to reconstruct what happened even when the underlying payment is handled by an external provider or commercial terms.

Required records:
- transaction/award reference;
- payer and payee references;
- gross commercial amount;
- Froto fee and fee basis;
- GST/tax components where applicable;
- payment method/mode;
- payment status;
- provider references when applicable;
- invoice/receipt number and issue date;
- refund/adjustment records;
- settlement/payout status.

## Two transaction paths

### Path A — Immediate/platform payment

Suitable for smaller freight/guest jobs and other transactions where platform payment makes commercial sense.

**Award → amount locked → Froto fee calculated → customer payment → work → completion confirmation → settlement/payout → invoice/receipt → review → Market Pulse**

### Path B — Commercial terms

Suitable for larger tenders, recurring warehousing and contracts commonly paid by invoice/terms.

**Award → contract/value recorded → Froto fee calculated under applicable rule → payment terms recorded → work/service lifecycle → invoice/financial record → Froto fee collection/settlement → review → Market Pulse**

Froto must not force a large B2B contract through consumer-style checkout merely to collect its fee.

## Fee-engine requirements

Do not hard-code a single percentage throughout application code. Create configurable fee rules capable of supporting:
- percentage fee;
- fixed fee;
- minimum fee;
- maximum/capped fee;
- transaction-type-specific rules;
- effective dates/versioning;
- promotion charges;
- future exemptions/introductory rules if approved.

The exact commercial numbers remain an approval decision and should be modelled before activation.

### Implementation status — inactive foundation

The canonical provider-neutral fee helper is `lib/commercial-fees.ts`. It supports percentage, fixed and percentage-with-limits calculations using integer minor units and basis points, plus rule-completeness checks. It does **not** select a rule, create a charge, activate a fee, or expose pricing to customers. No default percentage has been introduced.

The canonical provider-neutral invoice helper is `lib/commercial-invoices.ts`. It constructs consistent draft invoice/credit-note values and includes an explicit issue gate requiring an invoice number plus confirmed legal issuer and tax treatment. It does **not** determine GST treatment, issue invoices automatically, or create accounting/legal obligations.

These helpers are intentionally dormant until the fee schedule, GST treatment, invoice relationships and payment-provider decisions pass the approval gates below.

## Promoted listings

Promotion is optional and must never be required for normal marketplace participation.

Initial product concepts:
- Featured;
- Priority placement;
- Urgent freight;
- Featured warehouse capacity;
- Highlighted tender.

Promotion must be visibly identified so paid placement does not masquerade as neutral marketplace ranking.

## Data-model direction

Implementation should introduce explicit commercial records rather than overloading bid/job fields. Expected concepts include:
- `CommercialTransaction` — immutable link between award/job and commercial value;
- `FeeRule` / fee-rule snapshot — how Froto's fee was determined;
- `PlatformCharge` — Froto fee/promotion charge and tax/status;
- `PaymentRecord` — external provider/manual/commercial-terms payment state;
- `InvoiceRecord` — invoice/receipt metadata;
- `RefundAdjustment` — refunds, credits and corrections;
- `Promotion` — paid marketplace promotion and active period.

Final Prisma names/schema should be reviewed against the existing Job/Bid/Tender models before migration.

## Status model

Payment state should not be conflated with job state. A completed job can have an outstanding B2B invoice; an awarded job can have a successful prepayment.

Suggested payment states:
`NOT_REQUIRED`, `PENDING`, `REQUIRES_ACTION`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FAILED`, `OVERDUE`, `CANCELLED`.

Suggested settlement states:
`NOT_APPLICABLE`, `PENDING`, `AVAILABLE`, `PAID_OUT`, `FAILED`, `HELD`.

## Safety and accounting rules

- Monetary values stored in integer minor units where practical; avoid floating-point money arithmetic.
- Provider webhooks/events must be idempotent.
- Never trust a browser redirect alone as proof of payment.
- Maintain an audit trail for fee, payment, invoice and refund state changes.
- Never store raw card data in Froto.
- Do not expose another company's financial records through public APIs.
- GST/legal wording and tax-invoice obligations require Australian accounting/legal confirmation before production activation.

## Sprint 9 delivery order

1. Map existing award/job/tender data into the proposed commercial transaction model.
2. Model candidate fee structures using representative small, medium and large Froto transactions.
3. Define provider-neutral ledger, payment, settlement and invoice states.
4. Obtain financial-adviser input on provider/fee/tax structure.
5. Assess candidate marketplace payment providers against Australian requirements.
6. Approve fee policy and provider.
7. Add database commercial/ledger models.
8. Add transaction financial summary to awarded jobs.
9. Integrate approved provider in test/sandbox mode.
10. Add webhook-driven payment state.
11. Add invoices/receipts and GST records.
12. Add optional promoted listings.
13. UAT both immediate-payment and commercial-terms paths before production activation.

## Explicit non-goals for the first implementation

- mandatory subscriptions;
- building our own payment processor;
- storing raw card details;
- forcing all large contracts through instant checkout;
- activating a transaction percentage before commercial approval;
- integrating any payment provider before the current decision hold is lifted;
- advanced enterprise accounting integrations before the core ledger works reliably.

## Approval gates

The following require product-owner approval before production activation:
- transaction fee schedule;
- minimum/cap rules;
- selected payment provider;
- who is legally invoicing whom in each transaction path;
- GST treatment and invoice wording;
- refund/dispute policy;
- promoted-listing pricing.
