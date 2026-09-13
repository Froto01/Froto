-- Activate the approved Froto success-fee rule for guest auctions.
-- Guest customers pay no platform fee. The winning provider pays the same
-- launch success fee used for marketplace and tender work.
-- The fee is snapshotted at award and becomes earned only after the guest
-- customer confirms completion. Payment collection remains disabled.

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
VALUES (
  'fee_rule_guest_auction_launch_v1',
  'FROTO_GUEST_AUCTION_SUCCESS',
  1,
  'GUEST_AUCTION',
  300,
  10.00,
  500.00,
  1000,
  'PROVIDER',
  true,
  CURRENT_TIMESTAMP,
  'Approved launch policy: guest pays no fee; winning provider pays 3% ex GST, $10 minimum, $500 maximum; earned after guest-confirmed completion.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code", "version") DO NOTHING;
