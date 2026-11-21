# Confirmed Malaysia + Singapore source plan

Travel: 27 January–7 February 2027. Arrival in Kuala Lumpur is 28 January. Ten hotel nights: KL 28–31 January, Langkawi 31 January–3 February, Singapore 3–7 February. Malaysia-only source data is unchanged.

## Bookings and payments

| Booking | Local schedule | Paid INR | Checked / cabin |
|---|---|---:|---|
| Singapore Airlines, SQ423 + SQ108 | BOM T2 27 Jan 23:35 → SIN 28 Jan 07:30; SIN T2 09:15 → KUL T1 10:20 | 25,990 combined | 30 / 7 kg, both legs |
| Malaysia Airlines MH1438 | KUL T1 31 Jan 11:45 → LGK 12:55 | 6,847 | 25 / 7 kg |
| AirAsia AK732 | LGK 3 Feb 12:40 → SIN T4 14:25 | 6,602 | 20 / 7 kg |
| Air India AI2108 | SIN T2 7 Feb 19:40 → BOM T2 23:25 | 19,811 | 25 / 7 kg |

Four paid bookings, five segments, INR59,250 paid, no outstanding flight fare. Platform charges are already included. The outbound booking is **Awaiting ticketing**: payment is reported but e-ticket issuance is not verified. The SIN arrival terminal is unknown; the 1h45 connection requires a terminal transfer. Stay in permitted transit areas and verify gates/transfer guidance.

The shared FareGroup owns both connecting legs' fare, booking status and payment. The two zero-priced segment records retain legacy neutral status internally; their displayed booking status comes from the shared ticket. No duplicated flight Expenses are added.

| Hotel | Nights | Paid INR | Extra property balance |
|---|---:|---:|---:|
| Easy Hotel KL Sentral | 3 | 9,210 | MYR30 |
| Nadias Hotel | 3 | 10,758 | MYR39 |
| Hotel 81 Dickson | 4 | 28,421 | None reported |

Hotels paid: INR48,389. Flights + hotels paid: INR107,639.
MYR69 outstanding at the source rate of INR19/MYR = INR1,311.
Selected hotel forecast = INR49,700; flights + hotels forecast = INR108,950.
Other planned expenses and activities = INR51,100.
Total forecast = **INR160,050**. The existing saved budget is **INR155,000**, preserved under the saved-budget exception; forecast excess is INR5,050. Remaining forecast spending is INR52,411, including INR1,311 confirmed hotel balance. Pending unquoted attractions may increase the forecast.

bookingAmountINR fixes the reported hotel booking subtotal independently of nightly multiplication and future currency rates. propertyFees, propertyCurrency and propertyRate represent the extra whole-stay charges. Settings recalculation updates their estimated conversion, preserving INR booking totals and payments. Settlement increases the same hotel's INR paid amount, reduces its outstanding balance, and leaves the forecast unchanged. Charge classifications beyond “payable at property” were not supplied, so these balances are not invented tourism/heritage tax components.

Free cancellation is reported for all three bookings; exact deadlines are unknown.

## Itinerary

- 28 Jan: KUL T1 arrival 10:20, immigration/baggage, Easy Hotel luggage drop/check-in when permitted; Chinatown, Petaling Street, Central Market and KLCC exterior.
- 29 Jan: Batu Caves, Merdeka Square, Sultan Abdul Samad Building/heritage streets, Bukit Bintang dining.
- 30 Jan: Aquaria KLCC (price pending; no complimentary ticket existed in source data), KLCC Park, optional observation deck, shopping/packing.
- 31 Jan: checkout and KUL T1 transfer, target airport 09:45 for MH1438; LGK arrival 12:55, Nadias check-in/luggage, Pantai Cenang.
- 1 Feb: SkyCab, SkyBridge, photographs and flexible Oriental Village/evening; weather dependent.
- 2 Feb: ziplining and guided ATV with lunch/transfer buffers and safety checks; beach/packing. Planned, not booked.
- 3 Feb: checkout, target LGK airport 10:00 for 12:40 international departure. SIN T4 arrival 14:25–15:45 formalities, 15:45–16:45 transfer, Hotel 81 Dickson check-in until 17:15. Merlion 18:00–18:25, waterfront/The Shoppes until 19:15, transfer to Supertree Grove by provisional 19:45 show, dinner. Shorten or move sightseeing if delayed.
- 4 Feb: dedicated Universal Studios day; hours/ticket availability remain unverified. Existing illustrative admission estimate retained, no Express Pass.
- 5 Feb: Oceanarium, conditional Harry Potter, Skyline Luge (3–4 rides subject to package), Siloso Beach; travel/queue buffers and rain contingency.
- 6 Feb: Little India, temple area, Kampong Glam/Arab Street/Sultan Mosque, Haji Lane, Bugis; feasible Chinatown decorations and optional Clarke Quay. Chinese New Year's Day may alter openings.
- 7 Feb: breakfast, optional near-hotel walk, checkout, airport transfer, landside Jewel/Rain Vortex, transfer to **T2** and international formalities 16:00–18:00 for the 19:40 flight. No early bag drop at Jewel assumed.

All activity times are local. Flights retain local departure/arrival dates and times; durations apply India +05:30 and Malaysia/Singapore +08:00 without converting local calendar dates to UTC. No flight is duplicated as a sightseeing activity.

## Compatibility and availability

The source defaults change directly; browser plans and imported backups are not overwritten by a new migration. Existing browsers can export privately and use **Reset to published data** after deployment. Version-1 import/export accepts optional hotel currency and ticket-issuance fields. Earlier quote/alternative regression tests use a clearly named, non-identifying historical fixture; fresh-install tests cover these confirmed defaults.

Attraction availability/hours, the Garden Rhapsody programme, Harry Potter operation in February 2027, weather, airport gates, the exact outbound arrival terminal and cancellation deadlines still require confirmation. No bookings were submitted and no confidential identifiers were requested or retained.

## Files changed

- .githooks/pre-commit
- .github/workflows/deploy.yml
- .gitignore
- README.md
- docs/confirmed-bookings.md
- docs/privacy-audit.md
- e2e/confirmed-bookings.spec.ts
- e2e/february.spec.ts
- e2e/finance.spec.ts
- e2e/planner.spec.ts
- e2e/singapore.spec.ts
- package.json
- scripts/privacy_audit.py
- scripts/test_privacy_audit.py
- src/App.tsx
- src/components/CostOverview.tsx
- src/components/Editor.tsx
- src/components/FlightPlanning.tsx
- src/components/TransitPlanning.tsx
- src/data/default-trip-data.json
- src/lib/calc.ts
- src/lib/confirmedBookings.test.ts
- src/lib/februaryFlights.test.ts
- src/lib/finance.test.ts
- src/lib/januaryShift.test.ts
- src/lib/malaysiaCorrection.test.ts
- src/lib/model.ts
- src/lib/research.test.ts
- src/lib/singaporeItinerary.test.ts
- src/lib/storage.ts
- src/lib/transit.test.ts
- src/views/Hotels.tsx
- src/views/Itinerary.tsx
- src/views/Settings.tsx
- src/views/Transportation.tsx
- tests/fixtures/pre-confirmation-plan.json

## Validation

- ESLint and TypeScript/Vite production build passed.
- 120 Vitest tests passed, including seven confirmed-booking regressions.
- All 28 browser scenarios verified: the full run passed 26; after correcting destination-tab selection and accepting the explicit rate-recalculation confirmation in the new tests, all three confirmed-booking tests passed on rerun. No production calculation defect was hidden by those test corrections.
- Five privacy detector tests and the current-tree privacy check passed.
- History inspection intentionally reports old README identity content, author/committer metadata and old fictional test references; no history was rewritten.
