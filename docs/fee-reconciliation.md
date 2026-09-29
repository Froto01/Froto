# Fee reconciliation

The commercial register links each transaction to an admin-only billing page.

This release records invoices issued outside Froto and full payments already received. It does not issue tax invoices, send messages, collect money, support partial payments, or change historical fee amounts. No migration is required.

An administrator records the issued invoice reference, Brisbane calendar date, and exact GST-inclusive fee amount. Only EARNED fees can become INVOICED. A separate confirmed payment reference/date and matching full amount transitions INVOICED to PAID. Each event stores the actor ID and recording timestamp in the fee's billingHistory metadata. Conditional status/updatedAt writes reject stale or duplicate submissions without overwriting another event.

Fees Earned continues to include invoiced and paid fees. Fees Paid increases only when full payment is recorded; Outstanding excludes paid fees. These dashboard values exclude GST. The billing page shows the outstanding amount including GST. All fee rows contribute to aggregate totals, including records beyond the previous 100-row limit.

## Verification

Automated validation covers invoice/payment transitions, invalid states and duplicate state transitions, exact amount matching, invalid/future/backdated dates, references, and confirmation requirements. Every page and action independently calls requirePlatformAdmin before database access.

Preview acceptance should use an isolated test database: record a test invoice against an earned fee, verify it remains outstanding, then record matching simulated full payment and verify Paid increases while Outstanding decreases. Confirm duplicate submissions do not add events and a non-platform-admin cannot access either the page or action.

Do not mark the live test fees paid merely to exercise this feature: no payment receipt has been evidenced in the current test. Invoice issuance, payment integrations, partial allocations, reversals, and accounting exports remain separate work.


## Isolated billing verification — 30 September 2026

Backend result: PASS. Isolated Neon branch `uat-billing-2026-09-30` (`br-fancy-heart-axjf1fzn`), project `wild-smoke-56425660`, copied from production `br-sparkling-flower-ax1kb2y2`.

UAT Test 3's copied $16.50 fee advanced EARNED → INVOICED → PAID with SIMULATED references. Unauthenticated/non-admin calls, payment before invoice, incorrect amounts, missing confirmation, partial/excess payments, and repeated invoice/payment calls were rejected. Concurrent submissions produced exactly one invoice event and one payment event. Frozen fee values, earning date, actor IDs, and audit timestamps were retained.

| Stage | Earned ex GST | Paid ex GST | Outstanding ex GST |
| --- | ---: | ---: | ---: |
| Initial | $82.92 | $0.00 | $82.92 |
| Invoiced | $82.92 | $0.00 | $82.92 |
| Simulated paid | $82.92 | $15.00 | $67.92 |

Method: executed the existing recordBilling and requirePlatformAdmin source with simulated Clerk session context and stubbed Next cache calls. Prisma reads and conditional writes were bridged through the Neon SQL connector because direct driver connections were unavailable. This verifies backend logic and persistence; browser forms, real Clerk sessions, Prisma transport, and cache refresh remain unverified.

Production fee `cmu6epvot000204i9booqpknb` was independently checked after testing: still EARNED, with invoicedAt and paidAt null. The isolated branch retains simulated payment data for review and is not connected to the existing preview. Browser UAT against this branch remains pending.
