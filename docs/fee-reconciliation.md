# Fee reconciliation

The commercial register links each transaction to an admin-only billing page.

This release records invoices issued outside Froto and full payments already received. It does not issue tax invoices, send messages, collect money, support partial payments, or change historical fee amounts. No migration is required.

An administrator records the issued invoice reference, Brisbane calendar date, and exact GST-inclusive fee amount. Only EARNED fees can become INVOICED. A separate confirmed payment reference/date and matching full amount transitions INVOICED to PAID. Each event stores the actor ID and recording timestamp in the fee's billingHistory metadata. Conditional status/updatedAt writes reject stale or duplicate submissions without overwriting another event.

Fees Earned continues to include invoiced and paid fees. Fees Paid increases only when full payment is recorded; Outstanding excludes paid fees. These dashboard values exclude GST. The billing page shows the outstanding amount including GST. All fee rows contribute to aggregate totals, including records beyond the previous 100-row limit.

## Verification

Automated validation covers invoice/payment transitions, invalid states and duplicate state transitions, exact amount matching, invalid/future/backdated dates, references, and confirmation requirements. Every page and action independently calls requirePlatformAdmin before database access.

Preview acceptance should use an isolated test database: record a test invoice against an earned fee, verify it remains outstanding, then record matching simulated full payment and verify Paid increases while Outstanding decreases. Confirm duplicate submissions do not add events and a non-platform-admin cannot access either the page or action.

Do not mark the live test fees paid merely to exercise this feature: no payment receipt has been evidenced in the current test. Invoice issuance, payment integrations, partial allocations, reversals, and accounting exports remain separate work.
