import { januaryDate } from "./januaryDates";
import type { Hotel, Transport, Trip } from "./model";
import { blankHotel, blankTransport } from "./factories";
import { hotelTotal, transportTotal } from "./calc";
export const hotelQuotes = [
  {
    key: "ancasa",
    name: "AnCasa Hotel Kuala Lumpur, Chinatown",
    aliases: ["ancasa"],
    destination: "Kuala Lumpur",
    nightly: 3406,
    nightTax: 1086,
    area: "Chinatown",
    notes:
      "Strong candidate for central Chinatown location and reasonable cleanliness feedback; reviews and room details unverified.",
  },
  {
    key: "moxy",
    name: "Moxy Kuala Lumpur Chinatown",
    aliases: ["moxy"],
    destination: "Kuala Lumpur",
    nightly: 4422,
    nightTax: 1027,
    area: "Chinatown",
    notes:
      "Marriott property; modern rooms, rooftop pool and excellent cleanliness feedback reported. Standard offering excludes breakfast; verify the specific rate.",
  },
  {
    key: "sleeping-lion",
    name: "Sleeping Lion Suites",
    aliases: ["sleeping lion"],
    destination: "Kuala Lumpur",
    nightly: 4124,
    nightTax: 1072,
    area: "Bukit Bintang",
    notes:
      "Modern hotel with rooftop pool and central Bukit Bintang location; unverified.",
  },
  {
    key: "easy",
    name: "Easy Hotel KL Sentral",
    aliases: ["easy hotel"],
    destination: "Kuala Lumpur",
    nightly: 2476,
    nightTax: 644,
    area: "KL Sentral / Brickfields",
    notes:
      "Budget-friendly option with convenient KL Sentral transport connections.",
  },
  {
    key: "holiday-inn",
    name: "Holiday Inn Express Kuala Lumpur City Centre",
    aliases: ["holiday inn express"],
    destination: "Kuala Lumpur",
    nightly: 5812,
    nightTax: 0,
    area: "City Centre",
    breakfast: true,
    notes:
      "IHG property convenient for KLCC and Bukit Bintang. Breakfast included in supplied estimate. Complete nightly quote; base/tax breakdown unknown; do not add taxes again.",
  },
  {
    key: "81-dickson",
    name: "Hotel 81 Dickson",
    aliases: ["hotel 81 dickson", "81 dickson"],
    destination: "Singapore",
    nightly: 7862,
    nightTax: 0,
    area: "Little India",
    notes:
      "Private budget hotel near Little India and public transport. Check cleanliness and exact room category. Complete nightly quote includes taxes/fees; breakdown unknown.",
  },
] as const;
export const flightQuotes = [
  {
    key: "bom-kul",
    source: "Mumbai (BOM)",
    destination: "Kuala Lumpur (KUL)",
    from: "BOM",
    to: "KUL",
    date: "2027-01-18",
    fare: 24125,
    oldFare: 12500,
    mode: "International flight",
  },
  {
    key: "kul-lgk",
    source: "Kuala Lumpur (KUL)",
    destination: "Langkawi (LGK)",
    from: "KUL",
    to: "LGK",
    date: "2027-01-21",
    fare: 3567,
    oldFare: 3500,
    mode: "Domestic flight",
  },
  {
    key: "lgk-sin",
    source: "Langkawi (LGK)",
    destination: "Singapore (SIN)",
    from: "LGK",
    to: "SIN",
    date: "2027-01-24",
    fare: 5197,
    oldFare: 5500,
    mode: "International flight",
  },
  {
    key: "sin-bom",
    source: "Singapore (SIN)",
    destination: "Mumbai (BOM)",
    from: "SIN",
    to: "BOM",
    date: "2027-01-28",
    fare: 15312,
    oldFare: 14000,
    mode: "International flight",
  },
] as const;
const normalized = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
function isSingaporeResearchTrip(t: Trip) {
  return (
    t.start === januaryDate(t, "2027-01-18") &&
    t.end === januaryDate(t, "2027-01-28") &&
    ["Kuala Lumpur", "Langkawi", "Singapore"].every((name) =>
      t.stops.some((s) => normalized(s.name) === normalized(name)),
    ) &&
    !t.stops.some((s) => normalized(s.name) === "penang")
  );
}
export function isResearchTrip(t: Trip) {
  return (
    isSingaporeResearchTrip(t) ||
    (t.start === januaryDate(t, "2027-01-18") &&
      t.end === januaryDate(t, "2027-01-28") &&
      ["Kuala Lumpur", "Langkawi", "Penang"].every((name) =>
        t.stops.some((s) => normalized(s.name) === normalized(name)),
      ) &&
      !t.stops.some((s) => normalized(s.name) === "singapore"))
  );
}
const airport = (s: string) => {
  const explicit =
    s.match(/\(([A-Za-z]{3})\)/)?.[1] ??
    s.match(/\b(BOM|KUL|LGK|SIN|SZB)\b/i)?.[1];
  if (explicit) return explicit.toUpperCase();
  const n = normalized(s);
  return (
    [
      ["BOM", "mumbai"],
      ["KUL", "kuala lumpur"],
      ["LGK", "langkawi"],
      ["SIN", "singapore"],
    ].find(
      ([code, city]) =>
        n.split(" ").includes(code.toLowerCase()) || n.includes(city),
    )?.[0] ?? s
  );
};
const protectedRecord = (r: Hotel | Transport) =>
  r.status === "Booked" ||
  r.status === "Cancelled" ||
  r.paid > 0 ||
  r.refunded > 0 ||
  ("reference" in r && r.reference !== "");
export interface ResearchChange {
  key: string;
  kind: "hotels" | "transport";
  label: string;
  state: "ready" | "review" | "protected" | "current";
  reason: string;
  current: number | null;
  proposed: number;
  record: Hotel | Transport;
  existingId?: string;
}
export function researchChanges(t: Trip): ResearchChange[] {
  if (!isResearchTrip(t)) return [];
  const changes: ResearchChange[] = [];
  for (const quote of hotelQuotes.filter(
    (q) => q.destination === "Kuala Lumpur" || isSingaporeResearchTrip(t),
  )) {
    const start = januaryDate(
        t,
        quote.destination === "Singapore" ? "2027-01-24" : "2027-01-18",
      ),
      end = januaryDate(
        t,
        quote.destination === "Singapore" ? "2027-01-28" : "2027-01-21",
      );
    const key = `${t.id}:hotel:${quote.key}`;
    const matches = t.hotels.filter(
      (h) =>
        h.id === key ||
        (normalized(h.destination) === normalized(quote.destination) &&
          h.checkIn === start &&
          h.checkOut === end &&
          quote.aliases.some((alias) => normalized(h.name).includes(alias))),
    );
    const existing = matches.length === 1 ? matches[0] : undefined;
    const identityConflict =
      existing &&
      (normalized(existing.destination) !== normalized(quote.destination) ||
        existing.checkIn !== start ||
        existing.checkOut !== end);
    const quoted = {
      ...blankHotel(),
      id: existing?.id ?? key,
      name: quote.name,
      destination: quote.destination,
      checkIn: start,
      checkOut: end,
      room: "Unknown / unverified",
      nightly: quote.nightly,
      taxes: quote.nightTax * 3,
      taxMode: quote.nightTax ? "Separate" : "Included",
      status: "Researching",
      notes: `Area: ${quote.area}. ${quote.notes} User-supplied INR estimate, not a live quote. Cancellation and room conditions unverified.`,
      breakfast: "breakfast" in quote && quote.breakfast,
    };
    // Repricing an existing record never changes its selection, amenities or notes.
    const record: Hotel = existing
      ? {
          ...existing,
          nightly: quoted.nightly,
          taxes: quoted.taxes,
          taxMode: quoted.taxMode,
          currency: "INR",
          rate: 1,
        }
      : quoted;
    const total = hotelTotal(quoted)!;
    const current = existing ? hotelTotal(existing) : null;
    const state =
      matches.length > 1 || identityConflict
        ? "protected"
        : existing && protectedRecord(existing)
          ? "protected"
          : existing &&
              (current === total ||
                (existing.nightly === quoted.nightly &&
                  existing.taxes === quoted.taxes &&
                  existing.taxMode === quoted.taxMode &&
                  existing.currency === "INR" &&
                  existing.rate === 1))
            ? "current"
            : existing
              ? "review"
              : "ready";
    changes.push({
      key,
      kind: "hotels",
      label: quote.name,
      state,
      reason: identityConflict
        ? "Hotel stay or destination has changed; original retained for manual review."
        : matches.length > 1
          ? "Multiple matching hotels; edit the existing records to reconcile."
          : state === "protected"
            ? "Booked, paid, refunded, cancelled or referenced record preserved."
            : state === "review"
              ? "Existing hotel price differs. Keep your record or explicitly use the supplied price; extra property charges and details remain."
              : state === "current"
                ? "Matching quote already present."
                : "Add unselected, unpaid research candidate.",
      current,
      proposed: existing ? hotelTotal(record)! : total,
      record,
      existingId: existing?.id,
    });
  }
  for (const originalQuote of isSingaporeResearchTrip(t) ? flightQuotes : []) {
    const quote = {
      ...originalQuote,
      date:
        t.january2027Shift === 1 && originalQuote.key === "bom-kul"
          ? "2027-01-16"
          : januaryDate(t, originalQuote.date),
    };
    const key = `${t.id}:flight:${quote.key}`;
    let matches = t.transport.filter(
      (r) =>
        r.id === key ||
        (airport(r.source) === quote.from &&
          airport(r.destination) === quote.to &&
          r.departureDate === quote.date &&
          r.mode.toLowerCase().includes("flight")),
    );
    if (!matches.length)
      matches = t.transport.filter(
        (r) =>
          airport(r.source) === quote.from &&
          airport(r.destination) === quote.to &&
          r.mode.toLowerCase().includes("flight"),
      );
    const existing = matches.length === 1 ? matches[0] : undefined;
    const identityConflict =
      existing &&
      (airport(existing.source) !== quote.from ||
        airport(existing.destination) !== quote.to ||
        existing.departureDate !== quote.date);
    const record: Transport = {
      ...(existing ?? blankTransport()),
      id: existing?.id ?? key,
      source: existing?.source ?? quote.source,
      destination: existing?.destination ?? quote.destination,
      departureDate: quote.date,
      mode: quote.mode,
      currency: "INR",
      rate: 1,
      fare: quote.fare,
      taxes: 0,
      baggage: 0,
      seat: 0,
      notes:
        existing?.notes ??
        "User-supplied complete fare estimate; component breakdown and schedule unknown. Not a live quote.",
    };
    const current = existing ? transportTotal(existing) : null;
    const baseline =
      existing &&
      existing.currency === "INR" &&
      existing.rate === 1 &&
      existing.fare === quote.oldFare &&
      existing.taxes === 0 &&
      existing.baggage === 0 &&
      existing.seat === 0 &&
      existing.status === "Researching";
    const state =
      matches.length > 1 || identityConflict
        ? "protected"
        : existing && protectedRecord(existing)
          ? "protected"
          : current === quote.fare && existing?.mode === quote.mode
            ? "current"
            : existing && !baseline
              ? "review"
              : "ready";
    changes.push({
      key,
      kind: "transport",
      label: `${quote.from} → ${quote.to} · ${quote.date}`,
      state,
      reason: identityConflict
        ? "Route or departure date differs; preserve this flight and reconcile manually before adding a quote."
        : matches.length > 1
          ? "Multiple matching flights; reconcile manually. No additional flight will be added."
          : state === "protected"
            ? "Booking/payment history preserved; review this record manually."
            : state === "review"
              ? "User-edited fare or charges differ. Explicit confirmation replaces only fare components with the supplied total; schedule and provider remain."
              : state === "current"
                ? "Supplied fare already present."
                : existing
                  ? "Update untouched provisional fare; retain record ID and details."
                  : "Add missing unpaid research flight; times and provider unknown.",
      current,
      proposed: quote.fare,
      record,
      existingId: existing?.id,
    });
  }
  return changes;
}
export function applyResearchUpdate(
  t: Trip,
  keys: string[],
  allowReview = false,
): Trip {
  const changes = researchChanges(t).filter(
    (c) =>
      keys.includes(c.key) &&
      (c.state === "ready" || (allowReview && c.state === "review")),
  );
  let result = t;
  for (const c of changes) {
    if (c.kind === "hotels") {
      const record = c.record as Hotel;
      result = {
        ...result,
        hotels: c.existingId
          ? result.hotels.map((h) => (h.id === c.existingId ? record : h))
          : [...result.hotels, record],
      };
    } else {
      const record = c.record as Transport;
      result = {
        ...result,
        transport: c.existingId
          ? result.transport.map((r) => (r.id === c.existingId ? record : r))
          : [...result.transport, record],
      };
    }
  }
  return result;
}
