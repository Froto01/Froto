# Froto approved autonomous development policy

Status: approved operating rules; this file is a proposed change until reviewed and merged.

## Scope and priority
- First inspect current implementation, open PRs, GitHub Actions and the approved User Improvements handoff. Avoid duplicate work.
- Work in small independently reviewable increments, prioritising existing failing draft PRs and approved user improvements.
- Preserve Froto's original logo and supply-chain spot-market positioning.
- Use a dedicated feature/fix branch and DRAFT PR. Never push directly to `main`, `spot-requirements` or `automated-uat`.
- Document changed paths, tested SHA, exact commands and Actions URLs, passing/failing/not-run tests, risk and rollback.
- Do not report a successful build/UAT without execution evidence. No assumed or fabricated results.
- Stop after one attempted correction per failure per run; no unbounded retries.

## Permission boundaries
**Permitted without another routine approval:** read-only investigation, changes to previously approved non-sensitive UI/product work on dedicated branches, secret-free tests, draft PRs and progress reporting.

**Explicit owner approval required:** merging, production deployments, database migrations or production writes, fee/payer/payment rule changes, authentication or authorization policy changes, secret/key operations, branch protection changes, UAT credential boundaries, and credential-bearing browser test runs.

Never access or log credentials, disable authentication, bypass GitHub environment approval, or use production data as synthetic fixtures. `froto-uat` environment credentials must not be made available to unreviewed code. Existing GitHub UAT workflow and its protections remain separate from draft static checks.

## Evidence gates
- Secret-free PR checks: `npm ci`, `npm test`, `npx tsc --noEmit`, targeted ESLint.
- Production build: only when required environment configuration is available in a trusted runner; no fake database URLs.
- Authenticated UAT: only after explicit approval, verified protected environment and credential containment.
- Full browser matrix, real auth, deployed preview, migration verification and security findings remain independent gates. A blocked gate is not a pass.

## Reporting and ownership
At 6 AM Brisbane time, report verified completed work, blocked work, draft PRs, actual CI links and top three next tasks. Highlight the precise user action when required; do not require a repetitive 'proceed' for routine approved work.

## Agent provisioning
ChatGPT's scheduled development task can investigate and use its connected GitHub tools during its run. This document and CI checks do not themselves install a continuously running coding agent. A separate approved coding-agent integration and its GitHub permissions are required for event-driven continuous coding; do not claim it is active without observed agent-created PRs and successful checks.
