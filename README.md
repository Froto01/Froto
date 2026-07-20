# Froto

Froto is a logistics marketplace demo for bidding on warehouse capacity, transport capacity, and procurement tenders. It is currently a front-end-only product prototype built to show the core marketplace workflows before adding authentication, persistence, payments, or operational integrations.

This README includes a small handoff update for testing GitHub pull request publishing.

## Current Demo Features

- Landing page explaining the Froto marketplace concept.
- Platform marketplace with searchable demo listings.
- Listing detail pages with front-end-only bid rooms and bid history.
- Tender tab with demo tenders and a create tender flow.
- Create listing flow for carriers and 3PL warehouses.
- User role selection and onboarding flow.
- Dashboard with demo metrics, active bids, tenders, watched listings, suggested capacity, and recent activity.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn-style UI primitives
- Radix UI dialog primitives
- lucide-react icons

The app uses local/system font stacks so production builds do not need to fetch Google Fonts.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Run the production build locally:

```bash
npm run build
npm run start
```

## Main Routes

- `/` - landing page
- `/platform` - marketplace and tenders demo
- `/platform#tenders` - opens the tender tab
- `/platform/dashboard` - demo dashboard
- `/platform/listing/[id]` - listing detail and bid room
- `/platform/listings/new` - create listing demo flow
- `/platform/tenders/new` - create tender demo flow
- `/platform/onboarding` - role selection and onboarding demo flow

## Environment

No environment variables are required for the current demo.

See `.env.example` for the current placeholder.

## Current Limitations

- No authentication or user accounts.
- No database or persistent storage.
- Demo bids, listings, tenders, and onboarding submissions reset on refresh.
- No payment, escrow, invoicing, or settlement flow.
- No carrier, warehouse, or shipper verification.
- No real tender response workflow.
- No notifications or email delivery.
- No API routes yet.
- Remote listing images are configured for Unsplash demo images only.

## Next Roadmap

1. Add authentication and organization profiles.
2. Add database models for users, organizations, listings, bids, tenders, and tender responses.
3. Replace mock data with API-backed data.
4. Add create/edit/manage flows for listings and tenders.
5. Add bidding rules, timers, bid increments, and award states.
6. Add supplier response comparison for tenders.
7. Add notifications for bids, tender updates, and awards.
8. Add audit history and operational status tracking.
9. Prepare production deployment settings and monitoring.
