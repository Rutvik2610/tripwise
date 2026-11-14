# Make trip costs clear and add January 2027 research candidates

The overview previously separated operational flight information from hotel and expense totals. It now explains the projected trip cost through Flights, Selected Hotels, Other Expenses, and a Flights + Hotels subtotal, with budget headroom/overrun and stay-level completeness indicators. Bookings, payments, and unpaid commitments remain separate and follow the existing ledger.

Adds six unselected research hotels with explicit tax treatment and updates the four untouched provisional flight allowances to ₹48,201 in fresh demo trips. Saved users can preview and explicitly apply an idempotent research pack. Conflicting fares require confirmation; paid, booked, cancelled, referenced, or ambiguous records remain untouched for manual review. Existing selections, manual hotels, receipts/notes, independent scenarios, and version-1 backups are preserved. No LocalStorage reset or automatic import mutation.

Hotel comparisons support full-stay/nightly/review sorting, same-stay price differences, and direct dashboard links. Mobile stay cards show the selected hotel and cost without horizontal scrolling. Light and violet dark themes are preserved.

Validation: 43 unit tests, six Playwright suites, lint, and production build. The suites cover quote totals, tax inclusion, selected-only accommodation costs, exact flight sums, repeat application, protected conflicts, payment/refund invariants, backups, immediate hotel-switch recalculation, persistence, and mobile layouts.

Assumptions: all supplied quotes are provisional INR estimates; no times, airline details, room categories, review scores, or cancellation protection are fabricated. Pre-existing selected demo accommodation allowances and optional activity costs remain selected/included, so a fresh demo projects ₹169,235 (₹69,235 over budget). Saved-trip totals depend on the user's own selections and any unresolved conflicts. No merge or deployment performed.
