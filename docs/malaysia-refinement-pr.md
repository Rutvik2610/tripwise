# Correct Malaysia-only routing and simplify itinerary administration

Correct the Malaysia-only plan to Mumbai → Kuala Lumpur → Langkawi → Penang → Kuala Lumpur → Mumbai, with separate Jan 18–21 and Jan 27–28 KL stays. The single international ticket remains ₹35,550; corrected domestic quotes ₹3,567 + ₹3,251 + ₹2,479 give ₹9,297 domestic, ₹44,847 flights and ₹49,847 transportation with the existing ₹5,000 allowance.

A one-time saved-plan correction applies quoted provisional fares directly, removes obsolete unpaid PEN–BOM estimates, preserves entered schedules and protected booking/payment records, and leaves Malaysia + Singapore unchanged. No reset or new automatic hotel selection occurs. Confirmed Penang reservations overlapping the proposed departure are retained and flagged. Further user edits are not overwritten on refresh.

Both Transportation pages reuse one ledger-backed summary component. Ticket management is absent from Itinerary. Itinerary instead prioritizes route, daily sightseeing/travel events, accommodation and a single compact Singapore transit card with an expandable conditional Marina Bay schedule and an airside fallback. No A/B selector, separate excursion configuration or duplicate administrative cost panel remains.

Existing excursion notes/costs survive: historical activities are retired from the active ledger, meaningful estimates migrate once to Expenses, matching existing expenses retain their payments, and defaults do not fabricate costs. Optional schema extensions support prior backups, imports, refreshes and trip duplication. The Singapore connection remains undated with direction unknown until explicitly confirmed; the proposed Jan 28 flight does not imply that layover date.

Validation covers exact totals, correct route/stay separation, repeated migration, protected records, cost transfer/deduplication, scenario isolation, current/legacy backup compatibility, mobile views, both shared summaries and the removal of duplicate panels. Full lint, unit/browser and production-build results accompany the change.

Open confirmations: flight times and airlines, any preserved custom travel dates, final-night accommodation, Singapore connection date/direction, current entry permission and actual travel/airport requirements. Timings are planning allowances. Live ICA retrieval was blocked (403); official links and manual verification remain.
