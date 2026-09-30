# Sealed offer browser UAT — 30 September 2026

Status: Hardlywork bidder screen PASS from user screenshot; poster comparison and signed-in API privacy checks pending.

## Environment

Use only https://froto-5hojw2y6s-david-froto-project.vercel.app/platform/spot-requirements/uat-privacy-20260930 .

This billing-uat preview points to Neon branch br-fancy-heart-axjf1fzn. The newer spot-requirements deployment is READY, but this exercise stays on the established isolated preview.

Fixture: uat-privacy-20260930, titled “UAT — sealed offer privacy — 30 September”. Posting company: Froto test company. Simulated providers: Hardlywork ($250.00, private marker UAT-HARDLYWORK-PRIVATE-250) and Tree of Life ($987.65, private marker UAT-TREE-PRIVATE-98765). It is OPEN; offers close 6 October 2026 at 10:00 Brisbane time.

Fixtures were inserted directly for privacy testing. This does not test requirement creation, offer submission, notifications or real commitments. No notifications were created.

## Browser checks

1. Sign in as Hardlywork and open the fixture. Expect only its own $250.00 offer and private marker. The competing provider, $987.65 price and competing private marker must be absent.
2. On the same account, inspect the JSON returned by /api/spot-requirements/uat-privacy-20260930/offers if deeper evidence is needed. Expect SEALED and only ownOffer. The page screenshot alone does not establish absence from API responses.
3. Sign in as Froto test company and open the same fixture. Expect both providers and their offers, with comparison available.
4. If a Tree of Life test login is available, expect only its own $987.65 offer, with Hardlywork's price and notes absent.
5. Do not award during this privacy check. Awarding and post-award winner/loser access are separate checks.

Record the signed-in company, expected/actual result and screenshot or API evidence for each attempt. Browser UAT is pending until evidence is received; simulated handler tests alone do not satisfy it.

## Isolation evidence

Database reads after insertion found exactly one requirement and two offers in the isolated branch. Original branch br-sparkling-flower-ax1kb2y2 contained zero matching requirements and zero matching offers.

Route regression coverage and remaining launch checks are documented in launch-hardening-regression-matrix.md. Concurrent awards, live negative permission checks and dashboard-wide tenant isolation remain pending.

## Browser evidence — 30 September 2026, 12:43 Brisbane

User attachment image(20260930-024317).png shows the prepared OPEN requirement, a single “Your private offer” card at $250.00, SIMULATED Hardlywork offer, marker UAT-HARDLYWORK-PRIVATE-250, and Revise private offer. The screenshot contains no competing provider, $987.65 price or competing private marker. This passes the bidder screen display check. The account identity is inferred from the fixture's own-offer content; account header and address bar are not visible. It does not establish absence of competing data from signed-in API responses. Poster comparison, Tree of Life screen, and live negative permission checks remain pending.
