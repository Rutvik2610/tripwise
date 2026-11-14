# TripWise

A private, local-first travel planner for the journey from Mumbai to Malaysia and Singapore in January 2027—and every adventure after it. React, TypeScript, Vite, Tailwind CSS, Recharts, and Lucide. No account, API key, subscription, or backend.

## Run locally

Requires Node.js **22.12+** (Node 24 also supported) and npm.

```sh
npm ci
npm run dev
```

In a restricted workspace, use `npm ci --cache /tmp/tripwise-npm-cache`. The Vite server listens on port 5173 and all interfaces by default.

```sh
npm run lint      # ESLint, TypeScript, and React hook checks
npm test          # Deterministic business-logic and import-validation tests
npm run build     # TypeScript check and production bundle
npm run preview   # Serve the production bundle locally on port 4173
```

Browser smoke tests cover editing, payments, hotel selection, trip isolation, persistence, backup validation/restoration, themes, and all mobile screens:

```sh
npx playwright install chromium
npm run test:e2e
# Or use an existing Chromium installation:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

## Your planning space

- **Overview:** itemized cost forecast, budget headroom, confirmed commitments, actual payments, unpaid bookings, hotel savings for unbooked/unpaid stays, destination route, and checklist.
- **Expenses:** add/edit/copy/delete expenses, search text and statuses, filter categories, sort, group, and record payment/refund amounts, currency snapshots, receipts, provider links, and booking references.
- **Hotels:** compare alternatives per destination and stay, select one per stay, compare costs and verified scores, and calculate explicit included/separate taxes and property fees. Unknown prices and scores remain blank. Amenities are treated as unverified unless explicitly checked.
- **Transportation:** plan fares and routes with baggage, seats, schedules, terminals, payment records, and connection warnings. No schedules or connection protection are fabricated. Duration offsets cover India, Malaysia, and Singapore; manually verify other regions. The 3-hour connection buffer is a conservative planning heuristic, not an airport or airline guarantee.
- **Itinerary:** edit destinations, dates and day-by-day activities, switch calendar/timeline views, drag activities or use reorder arrows, and track costs/status. Dragging between populated days updates the activity date and destination; use the editor to move to any date.
- **Budget simulator:** Budget, Balanced, Comfortable, and Custom sandboxes with numeric inputs/sliders. Sandbox costs stay separate from the itemized plan so experimenting cannot overwrite bookings. The trip budget and rates update immediately; the sandbox retains its own hotel nights and spending assumptions.
- **Compare trips:** independent Malaysia-only and Malaysia + Singapore plans, with side-by-side category totals, daily spending, travel days, and remaining budgets. You can compare any two trips. Travel days are distinct transport departure dates; sightseeing days are remaining trip days, a planning approximation.
- **Checklist:** priorities, dates, notes, linked record IDs, and completion states. Visa and entry checks are reminders to consult current official requirements.
- **My trips:** create, edit, duplicate, archive/restore, and delete plans. Duplication preserves the complete plan and remaps record IDs. Record duplication clears booking/payment state where relevant to avoid accidental duplicate confirmed commitments.
- **Settings:** light/dark theme, manual currency rates, converter, explicit estimate recalculation, JSON backup/import, and confirmed demo reset.

## How costs work

All budgets, activity costs, and payment/refund amounts are stored in **INR**. Home currency changes display using your manual rates. Expenses, hotels, and transportation also retain original currency and an individual INR-per-unit exchange-rate snapshot.

The projected cost is **active expense estimates + selected hotel totals + active transportation fares + active itinerary activity estimates + unrecovered payments on cancelled records or unselected hotel options**. Optional activity ideas are included until cancelled/removed. Do not add a second expense for an item already tracked in the hotel, transportation, or itinerary module. Hotel payment history remains counted when an option is deselected. A booked hotel must be cancelled or changed back to a planning status before selecting an alternative for the same stay. Deleting any paid record removes its financial history; export first.

Confirmed costs are a subset of the forecast. Actual payments are not added again. Unpaid commitments are calculated per booked item, so a payment to one vendor cannot pay off another booking. Payment status is derived from paid and refunded INR amounts. Hotel general taxes are added only when marked Separate; tourism/heritage taxes and property fees are explicitly **additional whole-stay** amounts. Enter zero for fees already included in the nightly price. A selected hotel with a pending price generates a warning and is excluded from numeric totals until priced.

Default rates (MYR 19, SGD 64, USD 85 INR/unit), all initial prices, and all activity costs are **illustrative, not live quotations**. Seeded hotel room types and booking conditions are unverified. No seeded item is booked or paid. Accommodation allowances are placeholders, not hotel recommendations. The Penang hotel exists only in the Malaysia-only scenario. The budget reserve is a distinct expense; avoid adding another reserve for the same purpose.

Changing global exchange rates never silently rewrites records. **Recalculate unpaid planning estimates** explicitly updates only unbooked records with no historical payment. Booked or previously paid records retain their original rate. Record actual INR payments as charged, including bank spreads/fees where appropriate.

## Backup and restore

Changes save to `localStorage` under `tripwise.v1`. They belong to this browser and origin; development and deployed origins have independent storage. Export all trips regularly from the header or Settings. Backups can contain personal references and notes; keep them private.

Import via Settings. Version, types, currencies, dates, IDs, nonnegative amounts, refund bounds, and same-stay hotel selections are checked before confirmation/replacement. Version 1 is the only current schema; future versions should add explicit migrations before validation. Malformed saved data is not overwritten automatically: Settings offers a raw recovery export. Storage errors show a persistent backup warning. Reset requires confirmation and replaces all local data.

The production app registers a same-origin service worker. The shell, illustration, and linked JavaScript/CSS bundles are precached after the first successful installation for best-effort offline use. Browser eviction/private modes can prevent persistence. No external fonts, images, or runtime APIs are required. Updates use network-first requests. If troubleshooting stale assets, unregister the service worker and reload; export data before clearing site storage.

## GitHub Pages deployment

1. Push this project to `Rutvik2610/tripwise`, branch `main`.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included workflow installs with `npm ci`, lints, runs unit and browser tests, builds, uploads `dist`, and deploys with official Pages actions. Pull requests run validation but do not deploy.
4. Inspect the Actions deployment result for the actual published URL.

CI builds use `/tripwise/` as the Vite base; local builds use `/`. If the repository is renamed or hosted under a custom domain/root path, update `base` in `vite.config.ts`. Deployment is configured, not performed automatically by local setup. No backend or secrets are needed. Live server processes are not part of a build.

## Architecture and extension

- `src/lib/model.ts`: versioned typed entities and business vocabulary.
- `src/lib/calc.ts`: pure currency, hotel tax, forecast, payment, scenario, date, and route calculations.
- `src/lib/seed.ts`: labelled provisional data and blank record factories.
- `src/lib/storage.ts`: Zod schemas, import validation, and browser persistence boundary.
- `src/components/Editor.tsx`: reusable typed-field form editor for all records.
- `src/components/Charts.tsx`: responsive Recharts visualizations.
- `src/App.tsx`: application composition, trip state, and record mutations.
- `src/lib/context.ts`: typed planning context shared by the UI.
- `src/views/`: separate modules for every planning screen.
- `src/components/Shared.tsx`: reusable panels, statistics, badges, and actions.
- `src/styles.css`: responsive dashboard and theme tokens, alongside Tailwind utilities.
- `public/journey.svg`: bundled, original travel illustration.

To add ASP.NET Core and SQL later, put a repository/API adapter behind the persistence boundary, keep INR and currency snapshot semantics, map stable UUIDs to database records, and add schema migrations, authentication, and conflict resolution. Pure calculation functions can remain client-side and be mirrored/verified server-side. The current store is intentionally offline and single-device; it does not sync across tabs/devices.
