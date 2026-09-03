-- Activate Froto launch success-fee rules approved 3 September 2026.
-- Fees are calculated at award and earned only after confirmed job completion.
-- Payment collection and invoicing remain disabled.

INSERT INTO "FeeRule" (
  "id",
  "code",
  "version",
  "transactionType",
  "percentageBps",
  "minimumFee",
  "maximumFee",
  "gstBps",
  "payerType",
  "active",
  "effectiveFrom",
  "notes",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'fee_rule_marketplace_launch_v1',
    'FROTO_MARKETPLACE_SUCCESS',
    1,
    'MARKETPLACE_JOB',
    300,
    10.00,
    500.00,
    1000,
    'PROVIDER',
    true,
    CURRENT_TIMESTAMP,
    'Approved launch policy: 3% ex GST, $10 minimum, $500 maximum; provider pays; earned on confirmed completion.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'fee_rule_tender_launch_v1',
    'FROTO_TENDER_SUCCESS',
    1,
    'TENDER_JOB',
    300,
    10.00,
    500.00,
    1000,
    'PROVIDER',
    true,
    CURRENT_TIMESTAMP,
    'Approved launch policy: 3% ex GST, $10 minimum, $500 maximum; provider pays; earned on confirmed completion.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Guest-auction pricing is approved commercially but remains inactive until
-- its post-award completion lifecycle can earn fees on the same basis.
