# Hotel defaults and financial clarity

## Findings

The currency conversion function was already correct: an original MYR30 estimate at an INR19/MYR snapshot is INR570. However, payment and refund inputs previously accepted only INR totals, independently of the expense currency. Entering 30 in the payment field therefore stored INR30, not MYR30. This was an ambiguous payment-entry workflow, not a currency-symbol replacement or a converter multiplying the estimate incorrectly. Default payments are zero; there was no evidence requiring historical payment amounts to be rescaled.

The combined scenario's **INR74,700** “other expenses” was calculated by `costOverview()` as total projected cost minus flights minus selected accommodation. It is **INR33,200 in Expense records plus INR41,500 in itinerary activities**. It was not a duplicate default expense, flight or hotel charge. Calling this “Other Expenses” and linking it to only the Expenses module obscured that scope. The default Expenses list alone cannot sum to this cross-module total.

Existing estimates already used `max(estimate, net paid)` for active records and retained unrecovered payments for inactive/cancelled records. Paying an existing estimated record therefore did not inherently add its payment a second time. Two real gaps existed: everyday spending did not have an intuitive converted fully-paid workflow, and the model could not explicitly consume an allowance or attach an Expense payment to an itinerary activity.

## Source defaults and hotel dates

`src/data/default-trip-data.json` is now the authoritative, current default snapshot. `seed()` validates and clones it directly. It contains the existing February flight plan, unchanged flights/fares/destinations and the corrected hotel dates below. `published-trip-data.json` remains the historical November export for compatibility fixtures; it is not the fresh default source.

| Stay | Former dates | Corrected dates | Nights |
|---|---|---|---:|
| Initial Kuala Lumpur, both scenarios | Jan 17–20 | Jan 24–27 | 3 |
| Langkawi, both scenarios | Jan 20–23 | Jan 27–30 | 3 |
| Penang, Malaysia Only | Jan 23–26 | Jan 30–Feb 2 | 3 |
| Final Kuala Lumpur / Tune Hotel, Malaysia Only | Jan 26–27 | Feb 2–3 | 1 |
| Singapore, combined scenario | Jan 23–27 | Jan 30–Feb 3 | 4 |

All 14 hotel records in each scenario, including selected and unselected alternatives, are aligned. IDs, names, prices, tax amounts/bases, cancellation details, notes, payment/refund fields and selections are preserved. Both destination plans still have 10 nights. `correctDefaultHotelDates()` is a pure source-correction helper: it changes only hotels matching a destination's exact former stay, and is a no-op for already-corrected dates. It is **not** called during localStorage load or JSON import.

No new scenario-specific browser migration or revision field was introduced. Existing compatibility support remains. Existing browser data is never reset or replaced silently; an older cached default can be replaced through Settings → Reset to published data when desired. Export any newer local changes first. Source corrections become live through the existing GitHub Pages workflow after an authorized deployment.

## Financial semantics

- `amount`, `currency`, `rate`: original estimate and its saved INR conversion snapshot.
- `paid`, `refunded`: canonical INR gross payment/refund totals, unchanged in old backups.
- Optional `paymentSnapshot` / `refundSnapshot`: each total's entered currency, amount and historical rate. The form converts once and stores both the entered information and its INR equivalent. Refunds can have a different currency/rate.
- Net paid is payment minus refund. Currency formatting keeps paise; global rate changes do not rewrite a record's estimate/payment/refund snapshots.
- Projected cost: active estimates or net actual cost, whichever is larger; inactive/cancelled records contribute only unrecovered net payments.
- Remaining forecast spending: projected cost minus net paid.
- Trip budget remaining: budget minus projected cost.
- Confirmed but unpaid: remaining amounts on confirmed bookings, a subset of remaining forecast spending.

Changing the displayed payment currency re-expresses the current INR total instead of reinterpreting its numeric value. Existing foreign expenses with legacy payments and no currency evidence retain their stored INR amount; the editor explains this and offers explicit correction. Editing an existing estimate does not automatically rewrite actual payments.

### Everyday spending and reservations

New Food, Shopping and everyday local-transport items default to **Spent**, automatically recording the converted amount as paid. Users can choose **Estimated** instead. Partial payments/refunds are retained with appropriate labels. Explicit transit planning entries remain estimates. New flight/hotel/activity expense forms retain separate reservation and payment workflows; activity reservations display **Reserved** while retaining the internal `Booked` value. Existing legacy booking states are not silently reclassified. Category/status filters and text search use these display terms.

### Allowances and existing activities

Default planning allowances have an explicit `kind: "Allowance"`; imported records without this optional field retain their previous item semantics. There is no automatic matching by description or category. An item consumes a target only when its `allowanceId` is explicitly chosen. The allowance contributes its unallocated remainder; linked items contribute their own forecast/actual costs. Example: target INR5,000 plus a linked INR1,000 purchase forecasts INR5,000, with INR1,000 paid and INR4,000 left. A genuinely additional, unlinked INR1,000 item forecasts INR6,000. Explicitly linked overspending raises the forecast only above the target.

“Record payment” on an itinerary activity opens a linked Expense using `plannedActivityId`. The activity owns the forecast and actual payment once; the linked expense has no separate forecast contribution. The same estimated activity can therefore be paid without adding a second activity cost. A single aggregate payment record is maintained per activity. Cancellation/refund rules still retain legitimate unrecovered actual costs.

Links are validated within a trip, and activity/allowance links cannot be combined or nested ambiguously. Trip copies remap these references; item copies clear payment snapshots and activity payment identity. Parent deletion is guarded until dependent records are unlinked. No booking reference or historical payment amount is changed by loading the new schema.

## Reconciliation and defaults

| Contribution | Malaysia + Singapore | Malaysia Only |
|---|---:|---:|
| Flights | INR46,140 | INR44,762 |
| Selected hotels | INR53,642 | INR43,697 |
| Expenses module (includes local transport) | INR33,200 | INR26,200 |
| Itinerary activities | INR41,500 | INR28,600 |
| Total projected cost | **INR174,482** | **INR143,259** |
| Net paid in defaults | INR0 | INR0 |

The local-transport allowance is included in the Expenses line above; it is not added again. Flights still count each connecting ticket and selected alternative once. Unselected hotel/flight estimates stay excluded; legitimate unrecovered payments stay included. No flight quote or hotel price was changed.

The dashboard presents total projected cost, net paid, remaining forecast spending, trip budget remaining and confirmed-but-unpaid commitments. “Other projected costs” explicitly includes Expenses, itinerary activities and retained costs. Category and source reconciliation can be expanded into contributing records with estimates, forecast, paid, remaining and adjustments. Allowance usage shows targets, actual spending, remaining allowance and overrun. The Expenses page distinguishes its own forecast contribution from the whole-trip total; linked payments and allowance remainders explain why raw original amounts must not simply be added together.

## Validation and limitations

Automated coverage includes hotel-date idempotency/nights/prices, MYR/SGD/INR snapshots, independent refund rates, global-rate edits, preserving existing paid amounts, everyday statuses, explicit allowance consumption/overrun, existing activity payments, additional spending, cancellations, unselected alternatives, retained hotel payments, paise-level reconciliation, legacy backups, trip isolation and mobile/tablet layouts.

Payment fields are aggregate totals, not a bank transaction history. For a record paid in several currencies, enter the combined historical INR total. Category assignments do not automatically infer budget funding; explicitly select an allowance/activity or leave the item additional. Historical records with ambiguous payment currency require an explicit correction. Existing saved browser plans are not automatically replaced with the corrected source defaults. There is no backend, account or cloud synchronization.

Main files: `default-trip-data.json`, `defaultData.ts`, `seed.ts`, `calc.ts`, `finance.ts`, `model.ts`, `storage.ts`, `ExpenseFields.tsx`, `Editor.tsx`, `BudgetReconciliation.tsx`, `CostOverview.tsx`, expense/dashboard/itinerary/comparison/trip views and related unit/browser tests.

Final checks completed successfully: `npm run lint`, **109 unit tests** (`npm test`), TypeScript plus Vite production build (`npm run build`), and the **24-test browser suite** (`npm run test:e2e`). Updated refund/reopening and iPhone/tablet payment-form checks were rerun successfully after the final changes. `git diff --check` is clean. Implementation was prepared on `feature/financial-clarity`; release status is tracked by the GitHub Actions deployment.
