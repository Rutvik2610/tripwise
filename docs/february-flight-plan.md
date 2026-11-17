# January–February 2027 flight update

Both scenarios now use a trip calendar of **23 January–3 February 2027**, replacing the previous 16 January departure / 27 January return window. Kuala Lumpur arrival is **24 January**. The old stored calendar began on 17 January and excluded the overnight outbound flight; the revised calendar includes departure, so it spans 12 calendar days. Destination ordering and 10 planned destination nights are retained, as are the simulator assumptions. Stops and eligible dated non-hotel records move forward seven days. Hotel records, hotel dates, selections, prices, status, payments and notes are unchanged, including the original Tune Hotel date wording.

## Flight inventory

The same outbound is available in both scenarios, booked through MakeMyTrip if purchased:

| Date | Route | Flight | Local departure → arrival | Quote |
|---|---|---|---|---:|
| 23–24 Jan | BOM T2 → SIN | Singapore Airlines SQ 423, A380 | 23:35 IST → 07:30 SGT | Combined below |
| 24 Jan | SIN T1 → SZB (Subang) | SQ 8584, operated by Scoot, A320neo | 12:00 → 13:10, UTC+8 | **₹22,588 once for both segments** |
| 27 Jan | KUL T2 → LGK | AirAsia Berhad AK 6324, A320 | 12:55 → 14:00 MYT | ₹3,482, complete total |

Outbound Economy Value baggage is 7 kg cabin / 25 kg checked. Changi connection is 07:30–12:00 (4h30); arrival terminal remains unknown. “Terminal 0” is retained only in the explanatory note, not treated as a real terminal. KUL–LGK Economy / Regular Fare with Luggage 20 has 7 kg cabin / 20 kg checked, nonstop 1h05 and is non-refundable. The KUL departure is not changed to SZB: ground transfers must account for the distinct airports.

**Malaysia + Singapore:** retain LGK → SIN on 30 January at the older ₹4,946 estimate, requiring a new-date quote. On 3 February, retain two mutually exclusive SIN → BOM alternatives at ₹15,124 each:

- AI 2106 (unselected): 09:40 SGT–12:50 IST, Changi T2–Mumbai T2, A321, Economy ECO VALUE, 7 kg cabin / 25 kg checked, cancellation fees apply.
- **AI 2108 (selected):** 19:40 SGT–23:25 IST, 6h15. Aircraft, terminals, cabin class, baggage and fare conditions remain unverified. The equal price is user-reported.

**Malaysia Only:** retain LGK → PEN on 30 January (₹3,251), PEN → KUL on 2 February (₹2,479), and KUL → BOM on 3 February. The old ₹35,550 round-trip structure remains, marked **Older estimate — requote needed**. It is not a verified new-date fare. The new ₹22,588 outbound quote is displayed as a comparison and excluded from this scenario's forecast because it overlaps the retained round-trip estimate. Obtain a new full return quote before replacing that estimate. The previous 08:15–18:50 return transit is preserved only as historical notes; its live date, times and terminals are cleared and marked for reconfirmation. No new-date long-layover city schedule is assumed.

## Budget reconciliation (default snapshot)

| Item | Malaysia + Singapore | Malaysia Only |
|---|---:|---:|
| Included international forecast | ₹42,658 | ₹35,550 (old return estimate) |
| Included domestic forecast | ₹3,482 | ₹9,212 |
| Total airfare forecast | **₹46,140** | **₹44,762**, awaiting return requote |
| Local/airport allowance | ₹5,000 | ₹5,000 |
| Total transportation | ₹51,140 | ₹49,762 |
| Unchanged selected hotels | ₹53,642 | ₹43,697 |
| Overall projected cost | ₹174,482 | ₹143,259 |

The combined scenario's **₹41,194** new search-quote subtotal is ₹22,588 + ₹3,482 + ₹15,124. Its full airfare is ₹46,140 because the older active LGK–SIN estimate adds ₹4,946. Alternative fares and linked segment totals are never added twice. Quotes include the provided taxes/fees/discounts; old components are replaced rather than stacked on the complete price. Payments and refunds keep using the existing ledger.

## Migration, preservation and validation

`february2027Revision: 1` makes the update idempotent. Exact original scenario identity, route and seeded-record evidence limit it to the two intended plans; unrelated, renamed and ambiguous duplicate plans are retained. LocalStorage load, JSON import and default initialization use the same migration. No older migration that changes hotels runs at these boundaries. Existing IDs, user notes and all hotel objects are preserved. Booked, cancelled, paid, refunded or referenced flight/ticket records are retained unchanged and conflicts are reported inline instead of creating duplicate flights. Existing actual expense records are retained. The old published JSON remains the historical source snapshot; fresh defaults apply the new update at initialization.

Transport ticket groups count connecting fares once. Return decisions require exactly one active selected alternative and prevent deselecting protected history. Copying a trip remaps both ticket references and decision references. Explicitly unknown baggage remains unknown across backups and initialization.

Validation includes exact hotel equality, flight times and durations, SZB versus KUL, budget identities, single-ticket and mutually exclusive fares, stale quotes, protected records, old/current backup import, refresh idempotency, unrelated scenarios, simulator assumptions, return selection, calendar events and mobile layouts. Flights remain research estimates: no purchase, booking submission or paid provisioning was performed.

Implementation: `src/lib/februaryFlights.ts`, model/schema and ledger extensions, seed/load/import integration, `FlightPlanning.tsx`, transportation/transit/itinerary/hotel/dashboard warnings, editor fields and safe trip-copy handling. Tests: `src/lib/februaryFlights.test.ts` and `e2e/february.spec.ts`, with historical regression coverage retained.
