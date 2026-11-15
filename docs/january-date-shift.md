# January 2027 date shift

Both original scenarios move from 18–28 January to 17–27 January 2027: 11 calendar days and 10 accommodation nights remain unchanged. The overnight outbound journey departs Mumbai on 16 January and arrives in Kuala Lumpur on 17 January. Earlier templates incorrectly stored 18 January as outbound departure with no arrival date; this known placeholder is reconciled to the requested overnight dates. Existing explicitly stored overnight dates shift by one day.

| Record | Malaysia Only: before → after | Malaysia + Singapore: before → after |
|---|---|---|
| Trip dates | 18–28 Jan → 17–27 Jan | 18–28 Jan → 17–27 Jan |
| Overnight international outbound | BOM 17 / KUL 18 Jan → BOM 16 / KUL 17 Jan | BOM 17 / KUL 18 Jan → BOM 16 / KUL 17 Jan |
| KUL → LGK | 21 Jan → 20 Jan | 21 Jan → 20 Jan |
| LGK onward | PEN: 24 Jan → 23 Jan | SIN: 24 Jan → 23 Jan |
| PEN → KUL | 27 Jan → 26 Jan | Not applicable |
| International return | KUL: 28 Jan → 27 Jan | SIN: 28 Jan → 27 Jan |
| Initial Kuala Lumpur stay | 18–21 Jan → 17–20 Jan | 18–21 Jan → 17–20 Jan |
| Langkawi stay | 21–24 Jan → 20–23 Jan | 21–24 Jan → 20–23 Jan |
| Penang / Singapore stay | PEN 24–27 Jan → 23–26 Jan | SIN 24–28 Jan → 23–27 Jan |
| Final Kuala Lumpur stay | 27–28 Jan → 26–27 Jan | Not applicable |
| Singapore return transit | 28 Jan → 27 Jan; old undated placeholder becomes planned inbound | Not applicable |

The Singapore connection retains 08:15 arrival, 18:50 departure and 10h35 duration. Its date/direction are now user-planned, not independently airline-verified. Visa/entry permission, terminals, baggage and protected-connection requirements remain unverified where previously unverified. The Tune Hotel note retains 06:55 as the planned departure time, now on 27 January; no flight time is invented or overwritten.

## Unchanged default financial figures

These are repository defaults, not a snapshot of any browser's private localStorage. Existing user-specific amounts and selections remain intact.

| Estimate | Malaysia Only: before = after | Malaysia + Singapore: before = after |
|---|---:|---:|
| Flights | ₹44,847 | ₹48,201 |
| Selected accommodation | ₹30,471 (partial) | ₹46,334 |
| Transportation, including local allowance | ₹49,847 | ₹53,201 |
| Activities | ₹28,600 | ₹41,500 |
| Overall projected cost | ₹130,118 | ₹169,235 |
| Accommodation nights | 10 | 10 |

Malaysia's ₹35,550 return ticket stays counted once. Tune Hotel remains an unselected ₹7,250 candidate in the default plan; the final night's accommodation is still pending selection. If already selected in stored user data, its selection, price and payments survive.

## Migration and compatibility

The migration uses exact original scenario names, Mumbai origin, the matching destination route and original seeded-record evidence. Approximate dates alone never identify a trip. Renamed/custom plans and ambiguous duplicate identities are left untouched. `january2027Shift: 1` prevents repeat changes even after later edits. Already-shifted 17–27 January backups without the marker are adopted without moving dates again.

Typed dates shift using UTC calendar arithmetic, including hotel cancellation deadlines and checklist deadlines. Empty dates remain empty except the known legacy outbound and return-transit placeholders described above. Explicit January 2027 / December 2026 date wording in notes and labels shifts without altering prices, times, booking references or URLs. Notes remain, and transport records receive a provisional-schedule annotation.

LocalStorage load and JSON import use the same date-only migration. No previous hotel additions, itinerary corrections or fare repricing run during load/import. Original JSON files and the raw recovery copy remain untouched. Fresh installations use the shifted defaults; creating an unrelated trip does not invoke the migration. Research comparisons recognize the new dates so they do not offer duplicate old-date candidates.

Validation: 84 unit tests, the 13-test browser suite, lint, TypeScript and the GitHub Pages production build. Tests cover amounts/nights, overnight flight dates, all dated collections, preserved IDs/notes/bookings/payments, current and old backups, refresh idempotency, unrelated/custom/duplicate identities, scenario independence and mobile layouts.

No review section or confirmation step was added to the website. Both scenarios update automatically through the same date-only migration.
