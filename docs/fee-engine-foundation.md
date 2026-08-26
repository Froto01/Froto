# Fee Engine Foundation

## Scope

Phase A establishes Froto's commercial fee infrastructure without activating real charging.

Included:

- versioned fee rules;
- immutable transaction-fee snapshots;
- percentage calculation in basis points;
- optional minimum and maximum fee controls;
- explicit GST calculation;
- idempotency protection;
- lifecycle statuses from calculated through paid, waived, refunded or void;
- support for marketplace jobs, tender jobs, guest auctions and future promoted listings.

Not included:

- a live Froto fee percentage;
- a minimum or maximum commercial fee decision;
- a payment provider;
- automatic customer charging;
- invoice issuance;
- payout or settlement logic.

## Calculation rules

The calculation service operates in integer cents and basis points so it does not depend on JavaScript floating-point currency arithmetic.

1. Calculate the percentage fee from transaction amount and basis points.
2. Round half-up to the nearest cent.
3. Apply any minimum fee.
4. Apply any maximum fee.
5. Calculate GST on the resulting fee.
6. Return fee excluding GST, GST amount and fee including GST.

Minimum and maximum values apply to the fee before GST.

## Persistence rules

`FeeRule` records are versioned and inactive by default. No fee should be applied merely because a rule exists.

`TransactionFee` snapshots retain the rule code/version and all commercial inputs used for the calculation. Later changes to a `FeeRule` must therefore not rewrite the historical commercial record.

`idempotencyKey` is unique so award/completion retries cannot create duplicate fee records.

## Activation gate

Phase A must remain commercially dormant until Froto explicitly approves the fee schedule, payer, earning trigger and payment implementation.
