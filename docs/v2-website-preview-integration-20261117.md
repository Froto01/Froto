# Froto V2 integrated website source candidate | 17 November 2026 AEST (Brisbane)

**DRAFT, NOT A DEPLOYED VISUAL PREVIEW.** This candidate stacks onto unmerged PR #54 (Wave B). The assembled source combines approved V2 Wave A look and feel and listing workflow with the ongoing #54 Dashboard/My Business reporting work. No production merge, deployment, login-protected browser UAT, financial change, auth/security change or production database operation is authorised or performed. The public homepage is unchanged; its redesign still needs owner design review. December 2026 is an owner-preview planning goal, not a promised launch.

## Conflict and dependency matrix (read-only source audit, draft composition)

| PR | Shared paths/dependency | Candidate choice | Incomplete/acceptance |
|---|---|---|---|
| #38 V1 initial guided job | Marketplace + Dashboard collide with #42/#45/#50 + #54; public `app/page.tsx` | Omit conflicting V1 view and public homepage. V2 supersedes where contradictory | Spot requirement form enhancement from #38 separately review |
| #42 single header | `app/platform/page.tsx` overlaps #45/#50 | Reapply #42 single-header toolbar, keyboard tabs, unified mobile/desktop search to #50 source, preserving shared original-logo header | Browser, 375/768/1440px and keyboard UAT |
| #45 open-first states | Parent of #50 | Inherited through #50 and copied pure availability helper/tests | Time-boundary and stale-state live browser verification |
| #50 compact rows | Stacked on #45; overlaps #42 | Keep rows/private-offer labels, buyer/supplier context and V2 spot-market wording; integrate #42 toolbar, no duplicate logo | Responsive overflow and click-through |
| #49 workflow directions | Independent layout | Reuse established four paths and explicit buying/supplying labels, including accessible focus; no new routes | Guest redirect and role acceptance |
| #46 → #51 → #52 listing workflow | Parent chain and overlapping new-listing form | Copy the latest #52 composite including review-before-publish, create similar, explicit browser-local draft recovery; copy focused regression tests | Not cross-device; dates/terms must be reconfirmed; authenticated UAT |
| #54 reporting | Base branch | Preserve all source/count contracts, tenant/role-specific summaries and paginated My Business records | Partial pagination, graphs and authoritative financial ledger reconciliation outstanding |
| #36/#37/#39 UAT; #40 CI gate | Independent protected work | Do not combine or change UAT/security policies or baseline lint settings | Existing broad lint failure, protected UAT and security gates stay separate |

No overlap was silently resolved by accepting V1 homepage styling. No independent existing draft PR has been merged or closed.

## Acceptance before presenting a reviewable URL

1. Secret-free exact-SHA GitHub Actions: existing regression tests, copied Wave A tests, #54 reporting and pagination tests, integration smoke source tests, TypeScript and targeted ESLint. Report failed/not-run separately. **Source tests do not prove visual or tenant-integrated UAT.**
2. Desktop and mobile at 375/768/1440px: shared header/logo exactly once; header wrapping/search; compact rows without horizontal overflow; buying vs supplying routes; open/expired/awarded states; tender tabs and filters; accessible labels, focus order and keyboard-only action completion.
3. Listing form and privacy: validate quantity/dates/bid terms, explicit review, post-success create-similar reset, save/restore/discard browser draft, cancel overwrite, shared-device warning, fresh confirmation before publish; no cross-account/role data exposure; sealed offers remain sealed.
4. Dashboard vs My Business: same company/role/state counts and deep-link filters for 0, 1, 25, 26 and 101+ records; action-required vs finished/cancelled separation; agreed value never shown as paid/earned/settled; incomplete data explicitly unknown; browser/ledger data checks pending approved isolated UAT.
5. CI build and browser checks where allowed. No preview deploy URL until scoped preview permissions, independent security/UAT gates, and explicit owner-facing preview review controls are verified. No homepage redesign without owner design review.

## Rollback / safeguards

The exact base is #54 SHA `af0a686a40f9f70a5dc7fd16cd2b05d7867813a7`. This stacked PR can be closed/reverted without touching original feature branches or production. The candidate's `vercel.json` explicitly disables automatic deployment on both #54 and this candidate branch. The only manually reconciled UI file is `app/platform/page.tsx`: #50 responsive marketplace + #42 header/toolbar. No auth, payment, migration, fee, payer or security-sensitive code is included.
