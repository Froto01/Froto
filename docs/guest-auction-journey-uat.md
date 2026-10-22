# Guest auction journey UAT — 23 October 2026

Status: PREPARED. Authenticated browser posting, bidding, privacy, award, lifecycle and review checks remain pending.

## Roles and sequence

Use the isolated billing-uat preview. The guest customer must have an individual account with no company membership; the preparation query found one existing PERSONAL account with three older guest jobs, but possession of that account's login has not been assumed. A newly registered individual account can also use this test.

1. Open /platform/uat/guest-journey as the guest customer. Click Create simulated guest job. This invokes the actual /api/guest-auctions POST with the current Clerk session and normal validation. The job is clearly labelled simulated, has two packed boxes from Brisbane to Gold Coast, a seven-day bidding window and notes SIMULATED_GUEST_E2E_UAT_20261023. Configured matching opportunity alerts can run through the normal application flow. No database fixture is inserted by the assistant.
2. Record the real created auction ID and independently check the owner, OPEN state, zero bids and no fee. Capture the actual job page. The helper page finds an existing matching job for the signed-in owner before showing another create button; its client has a synchronous click lock. After a timeout/error, reopen it to check whether creation completed before retrying.
3. Froto test company submits a $250 bid through the ordinary auction detail page. Hardlywork submits $300. Capture each company's own-bid view; rival amounts, identities and private notes must not appear. Then reopen as the guest and confirm both bids and provider review summaries are available. Keep bids distinct to detect privacy mistakes. Do not use the earlier company-award role labels for this guest flow.
4. Guest selects a company after comparing price and reviews, and confirms early close if the seven-day bidding window remains open. Independently verify one winner, coherent bid states, one provider-paid GUEST_AUCTION CALCULATED fee and the winner notification. Guest pays no platform fee in the current policy. Repeated award must fail. Larger simultaneous guest award tests are separate evidence, not yet passed.
5. Winning provider performs ACCEPT, START and DELIVER in order. Guest confirms COMPLETE. Independently verify each persisted state and a single change from CALCULATED to EARNED on customer confirmation. No invoice/payment is part of this test.
6. Guest submits a rating/comment for the awarded provider only after COMPLETED. Verify one review with correct auction, reviewer and winning company; early, unrelated-user and repeated reviews must be rejected in their separate negative checks.

## Safeguards fixed before the test

The guest award route previously used an unguarded source update in a transaction without Serializable isolation. Two requests could attempt to replace the winner while the immutable fee snapshot remained tied to the earlier winner. The route now conditionally claims OPEN/null-award state using updateMany, stops before bid/fee/notification writes on a zero-count claim, uses Serializable transactions, and maps P2034 conflicts to HTTP 409 refresh guidance. Other errors propagate.

The guest bid route also accepted amounts with more than two decimals, allowing database rounding to alter submitted prices. It now rejects excess precision while retaining valid cent amounts such as 19.99.

Six actual-handler regression tests cover lost claims, Serializable conflict mapping, unrelated-owner rejection, successful-then-repeat fee/notification counts, valid 19.99 and invalid 19.999 bids. Four tests failed against the old source and pass after the changes; two control tests already passed. The full suite now has 126 passing tests. ESLint, TypeScript and whitespace checks pass. These tests use synthetic identities/database models and do not establish real guest concurrency or Clerk browser sessions.

The UAT helper page requires preview/billing-uat, signed-in individual identity and a marker unique to the isolated database before offering creation. Company accounts receive instructions to switch accounts. Test pages are not included in the working/production branch. No existing guest jobs, user memberships, billing rules or production data were changed by preparation. Overall launch readiness remains incomplete.
