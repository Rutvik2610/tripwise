import { januaryDate } from "./januaryDates";
import { addAirportHotel } from "./airportHotel";
import type { Expense, Hotel, Store, Transport, Trip } from "./model";
import { blankExpense, blankTransport } from "./factories";
import {
  applyMalaysiaPlan,
  isMalaysiaOnly,
  isInbound,
  roundTripTicket,
} from "./transit";
import { transportTotal, expenseTotal } from "./calc";
const text = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const normalizeKL = (s: string) =>
  /kuala\s*lumpur/i.test(s) || s.trim().toUpperCase() === "KLA"
    ? s.replace(/\bKLA\b/gi, "KUL")
    : s;
export function airportCode(s: string) {
  const explicit =
    s.match(/\(([A-Za-z]{3})\)/)?.[1] ??
    s.match(/\b(BOM|KUL|KLA|LGK|PEN|SIN)\b/i)?.[1];
  if (explicit)
    return explicit.toUpperCase() === "KLA" ? "KUL" : explicit.toUpperCase();
  return (
    [
      ["BOM", "mumbai"],
      ["KUL", "kuala lumpur"],
      ["LGK", "langkawi"],
      ["PEN", "penang"],
      ["SIN", "singapore"],
    ].find(([, city]) => s.toLowerCase().includes(city))?.[0] ?? s
  );
}
export const malaysiaDomesticQuotes = [
  {
    from: "KUL",
    to: "LGK",
    source: "Kuala Lumpur (KUL)",
    destination: "Langkawi (LGK)",
    date: "2027-01-21",
    amount: 3567,
  },
  {
    from: "LGK",
    to: "PEN",
    source: "Langkawi (LGK)",
    destination: "Penang (PEN)",
    date: "2027-01-24",
    amount: 3251,
  },
  {
    from: "PEN",
    to: "KUL",
    source: "Penang (PEN)",
    destination: "Kuala Lumpur (KUL)",
    date: "2027-01-27",
    amount: 2479,
  },
] as const;
const flightHistory = (r: Transport) =>
  r.status === "Booked" ||
  r.paid > 0 ||
  r.refunded > 0 ||
  !!r.reference ||
  !!r.fareGroupId;
const provisional = (r: Transport) =>
  !flightHistory(r) &&
  ["Researching", "Shortlisted", "Planned"].includes(r.status);
const protectedHotel = (h: Hotel) =>
  h.status === "Booked" ||
  h.status === "Cancelled" ||
  h.paid > 0 ||
  h.refunded > 0;
/** One-time, targeted correction. Later user edits are never re-applied over. */
export function correctMalaysiaTrip(original: Trip): Trip {
  if (!isMalaysiaOnly(original) || original.malaysiaPlanRevision === 2)
    return original;
  let t = applyMalaysiaPlan(original, true);
  t = {
    ...t,
    transport: t.transport.map((r) => ({
      ...r,
      source: normalizeKL(r.source),
      destination: normalizeKL(r.destination),
    })),
  };
  // Remove only obsolete planning records, not actual booking/payment history.
  t = {
    ...t,
    transport: t.transport.filter(
      (r) =>
        !(
          airportCode(r.source) === "PEN" &&
          airportCode(r.destination) === "BOM" &&
          !flightHistory(r) &&
          (provisional(r) || r.notes.includes("Superseded unpaid Penang"))
        ),
    ),
  };
  for (const q of malaysiaDomesticQuotes) {
    const matches = t.transport.filter(
      (r) =>
        airportCode(r.source) === q.from &&
        airportCode(r.destination) === q.to &&
        r.mode.toLowerCase().includes("flight"),
    );
    if (matches.length === 1 && provisional(matches[0])) {
      const r = matches[0];
      const financialChange =
        transportTotal(r) !== q.amount || r.currency !== "INR" || r.rate !== 1;
      const notes = financialChange
        ? `${r.notes}\nJanuary 2027 user quote updated to INR ${q.amount} total. Previous provisional components retained here: ${r.fare} base + ${r.taxes} tax + ${r.baggage} baggage + ${r.seat} seat (${r.currency}, INR rate ${r.rate}). Exact time, airline and ticket conditions remain unverified.`
        : r.notes;
      t = {
        ...t,
        transport: t.transport.map((x) =>
          x.id === r.id
            ? {
                ...r,
                fare: q.amount,
                taxes: 0,
                baggage: 0,
                seat: 0,
                currency: "INR",
                rate: 1,
                mode: "Domestic flight",
                status: "Researching",
                departureDate: r.departureDate || q.date,
                notes,
              }
            : x,
        ),
      };
    } else if (!matches.length) {
      t = {
        ...t,
        transport: [
          ...t.transport,
          {
            ...blankTransport(),
            id: `${t.id}:my-${q.from.toLowerCase()}-${q.to.toLowerCase()}`,
            source: q.source,
            destination: q.destination,
            departureDate: q.date,
            mode: "Domestic flight",
            fare: q.amount,
            notes:
              "User-supplied total INR estimate. Proposed travel date; airline, number, exact times and conditions unverified.",
          },
        ],
      };
    }
  }
  t = {
    ...t,
    transport: t.transport.map((r) =>
      r.fareGroupId && isInbound(r) && !r.departureDate && r.status !== "Booked"
        ? {
            ...r,
            departureDate: "2027-01-28",
            notes: `${r.notes}\n28 January is the proposed return date, not a confirmed flight schedule.`,
          }
        : r,
    ),
  };
  const oldPenang = t.stops.find(
    (s) =>
      text(s.name) === "penang" &&
      s.start === "2027-01-24" &&
      s.end === "2027-01-28",
  );
  if (oldPenang)
    t = {
      ...t,
      stops: t.stops.map((s) =>
        s.id === oldPenang.id ? { ...s, end: "2027-01-27" } : s,
      ),
    };
  if (
    !t.stops.some(
      (s) =>
        text(s.name) === "kuala lumpur" &&
        s.start === "2027-01-27" &&
        s.end === "2027-01-28",
    )
  )
    t = {
      ...t,
      stops: [
        ...t.stops,
        {
          id: `${t.id}:kl-final`,
          name: "Kuala Lumpur",
          country: "Malaysia",
          start: "2027-01-27",
          end: "2027-01-28",
        },
      ].sort((a, b) => a.start.localeCompare(b.start)),
    };
  // Re-scope unpaid options only; a booked/paid four-night reservation remains intact.
  t = {
    ...t,
    hotels: t.hotels.map((h) =>
      text(h.destination) === "penang" &&
      h.checkIn === "2027-01-24" &&
      h.checkOut === "2027-01-28" &&
      !protectedHotel(h) &&
      !(
        h.selected &&
        t.hotels.some(
          (other) =>
            other.id !== h.id &&
            other.selected &&
            text(other.destination) === "penang" &&
            other.checkIn === "2027-01-24" &&
            other.checkOut === "2027-01-27",
        )
      )
        ? {
            ...h,
            checkOut: "2027-01-27",
            notes: `${h.notes}\nProposed Penang stay now ends 27 January. Recheck the quote and whole-stay fees for three nights.`,
          }
        : h,
    ),
  };
  const expenses = [...t.expenses];
  const retiredIds = new Map<string, string>();
  const activities = t.activities.map((a) => {
    if (
      !a.layoverId ||
      a.retiredTransit ||
      !t.layovers?.some((l) => l.id === a.layoverId && l.airport === "SIN")
    )
      return a;
    const hasUserData =
      a.cost > 0 ||
      a.costPending === false ||
      a.includeInBudget === true ||
      a.status === "Booked" ||
      (a.notes !== "" && !a.notes.startsWith("Optional candidates only:"));
    if (hasUserData) {
      const existing = expenses.find(
        (e) =>
          e.sourceActivityId === a.id ||
          e.id === `${a.id}:expense` ||
          (text(e.description) === text(a.name) &&
            e.date === a.date &&
            e.destination.toLowerCase().includes("singapore") &&
            expenseTotal(e) === a.cost),
      );
      if (existing) retiredIds.set(a.id, existing.id);
      else {
        const e: Expense = {
          ...blankExpense(),
          id: `${a.id}:expense`,
          description: a.name,
          destination: a.destination,
          date: a.date,
          category:
            a.category === "Food"
              ? "Food"
              : a.category === "Transportation"
                ? "Local transportation"
                : "Attractions",
          currency: "INR",
          rate: 1,
          amount: a.cost,
          costPending: a.costPending === true,
          includeInBudget: a.includeInBudget !== false,
          bookingStatus:
            a.status === "Booked"
              ? "Booked"
              : a.status === "Cancelled"
                ? "Cancelled"
                : "Planned",
          sourceActivityId: a.id,
          layoverId: a.layoverId,
          notes: `${a.notes}\nTransport notes: ${a.transport}\nRetained planning cost from the retired transit activity; counted only in Expenses. No payment has been fabricated.`,
        };
        expenses.push(e);
        retiredIds.set(a.id, e.id);
      }
    }
    return { ...a, retiredTransit: true };
  });
  t = {
    ...t,
    activities,
    expenses,
    checklist: t.checklist.map((c) =>
      retiredIds.has(c.related)
        ? { ...c, related: retiredIds.get(c.related)! }
        : c,
    ),
  };
  return { ...t, malaysiaPlanRevision: 2 };
}
export function correctMalaysiaStore(s: Store): Store {
  const trips = s.trips.map((t) => addAirportHotel(correctMalaysiaTrip(t)));
  return trips.every((t, i) => t === s.trips[i]) ? s : { ...s, trips };
}
export function malaysiaCorrectionWarnings(t: Trip) {
  if (!isMalaysiaOnly(t)) return [];
  const messages: string[] = [];
  for (const q of malaysiaDomesticQuotes) {
    const matches = t.transport.filter(
      (r) =>
        airportCode(r.source) === q.from &&
        airportCode(r.destination) === q.to &&
        r.mode.toLowerCase().includes("flight") &&
        r.status !== "Cancelled",
    );
    if (
      matches.length === 1 &&
      matches[0].departureDate &&
      matches[0].departureDate !== januaryDate(t, q.date)
    )
      messages.push(
        `${q.from} → ${q.to} retains its existing ${matches[0].departureDate} date; the proposed route uses ${januaryDate(t, q.date)}. Check the stay connections.`,
      );
    if (matches.length > 1)
      messages.push(
        `Multiple ${q.from} → ${q.to} records were preserved; reconcile them before treating totals as final.`,
      );
    else if (
      matches[0] &&
      flightHistory(matches[0]) &&
      transportTotal(matches[0]) !== q.amount
    )
      messages.push(
        `${q.from} → ${q.to} has protected booking/payment details; its existing amount was preserved instead of the INR ${q.amount} estimate.`,
      );
  }
  if (
    t.transport.some(
      (r) =>
        airportCode(r.source) === "PEN" && airportCode(r.destination) === "BOM",
    )
  )
    messages.push(
      "A Penang → Mumbai record with history was retained. Reconcile it against the proposed Kuala Lumpur return.",
    );
  if (
    t.hotels.some(
      (h) =>
        text(h.destination) === "penang" &&
        h.checkOut > januaryDate(t, "2027-01-27") &&
        protectedHotel(h),
    )
  )
    messages.push(
      `A booked or paid Penang stay extends past the proposed ${t.january2027Shift === 1 ? "26" : "27"} January departure. Its reservation and financial history are unchanged; review the overlap.`,
    );
  const g = roundTripTicket(t);
  if (!g)
    messages.push(
      "The international return quote could not replace protected flight records. Review the ticket in Transportation.",
    );
  return messages;
}
