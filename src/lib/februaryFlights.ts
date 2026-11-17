import type { FareGroup, Layover, Store, Transport, Trip } from "./model";
import { blankTransport } from "./factories";
import { daysBetween } from "./calc";

const names = [
  "Malaysia + Singapore Solo Trip 2027",
  "Malaysia only · Three islands & cities",
];
export const airportCode = (s: string) =>
  (
    s.match(/\(([A-Za-z]{3})\)/)?.[1] ??
    s.match(/\b(BOM|KUL|SZB|SIN|LGK|PEN)\b/i)?.[1] ??
    ""
  ).toUpperCase();
export const routeIs = (r: Transport, a: string, b: string) =>
  airportCode(r.source) === a && airportCode(r.destination) === b;
export function addWeek(s: string): string {
  if (!s) return s;
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
export const hasHistory = (r: {
  status: string;
  paid: number;
  refunded: number;
  reference?: string;
}) =>
  r.status === "Booked" ||
  r.status === "Cancelled" ||
  r.paid > 0 ||
  r.refunded > 0 ||
  !!r.reference;
export const activeAlternative = (r: Transport) =>
  !r.decisionId || r.selectedAlternative === true;
function eligible(t: Trip) {
  const index = names.indexOf(t.name);
  return (
    index >= 0 &&
    /mumbai/i.test(t.departure) &&
    ["Kuala Lumpur", "Langkawi", index === 0 ? "Singapore" : "Penang"].every(
      (city) => t.stops.some((s) => s.name === city),
    ) &&
    t.hotels.some((h) => h.id.startsWith(t.id + ":hotel:")) &&
    ((t.start === "2027-01-17" && t.end === "2027-01-27") ||
      (t.start === "2027-01-23" && t.end === "2027-02-03"))
  );
}
const connection = (t: Trip, groupId: string): Layover => ({
  id: `${t.id}:feb-outbound-connection`,
  fareGroupId: groupId,
  connectionOnly: true,
  airport: "SIN",
  timezone: "Asia/Singapore",
  date: "2027-01-24",
  direction: "Outbound",
  arrivalTime: "07:30",
  departureTime: "12:00",
  arrivalTerminal: "",
  departureTerminal: "T1",
  entry: "Verification pending",
  baggage: "Unknown",
  protectedConnection: "Unknown",
  additionalCheckIn: "Unknown",
  option: "Airport",
  disembarkation: null,
  immigration: null,
  travelOut: null,
  travelBack: null,
  formalities: null,
  baggageCheckIn: null,
  safetyBuffer: null,
  airlineUrl: "",
  notes:
    "User flight-search details: 4h30 connection. Terminal change indicated; screenshot's Terminal 0 is not a verified terminal. Arrival terminal, through baggage, connection protection and airport procedures require confirmation. No city sightseeing or entry permission assumed.",
});
const quoteNote =
  "User-provided flight-search quote, not booked or paid. Total includes quoted taxes, fees and discounts; do not add them again.";
function quoted(base: Transport, patch: Partial<Transport>): Transport {
  return {
    ...base,
    currency: "INR",
    rate: 1,
    fare: 0,
    taxes: 0,
    baggage: 0,
    seat: 0,
    paid: 0,
    refunded: 0,
    reference: "",
    status: "Researching",
    refundable: false,
    cabinClass: "Economy",
    cabinBaggagePieces: 1,
    cabinBaggageKg: 7,
    quoteStatus: "User search quote",
    ...patch,
    notes: `${base.notes}\nPrevious provisional price components retained for reference: ${base.fare} base + ${base.taxes} taxes + ${base.baggage} baggage + ${base.seat} seats (${base.currency}, INR rate ${base.rate}).\n${quoteNote}${patch.notes ? "\n" + patch.notes : ""}`,
  };
}
export function updateFebruaryTrip(t: Trip): Trip {
  if (t.february2027Revision === 1 || !eligible(t)) return t;
  const malaysia = t.name === names[1],
    shifted = t.start === "2027-01-23";
  const conflicts: string[] = [];
  const protectedFlight = (r: Transport) =>
    hasHistory(r) ||
    !!t.fareGroups?.some((g) => g.id === r.fareGroupId && hasHistory(g));
  const warn = (message: string) => {
    if (!conflicts.includes(message)) conflicts.push(message);
  };
  const transport = t.transport.map((r) => {
    if (protectedFlight(r)) {
      warn(
        `${r.source} → ${r.destination}: booking/payment/reference history retained unchanged; reconcile dates and the new quote manually.`,
      );
      return r;
    }
    return {
      ...r,
      departureDate: shifted ? r.departureDate : addWeek(r.departureDate),
      arrivalDate: shifted ? r.arrivalDate : addWeek(r.arrivalDate),
      ...(r.mode.toLowerCase().includes("flight")
        ? { quoteStatus: "Older estimate — requote needed" as const }
        : {}),
      notes: r.mode.toLowerCase().includes("flight")
        ? `${r.notes}\nDates moved to the January–February plan. Previous schedule and fare require a new quotation; no airline confirmation assumed.`
        : r.notes,
    };
  });
  let next: Trip = {
    ...t,
    february2027Revision: 1,
    start: "2027-01-23",
    end: "2027-02-03",
    plannedNights:
      t.plannedNights ??
      t.stops.reduce((sum, s) => sum + daysBetween(s.start, s.end), 0),
    // Deliberately retain the original hotel array, all objects and every field.
    hotels: t.hotels,
    stops: t.stops.map((s) => ({
      ...s,
      start: shifted ? s.start : addWeek(s.start),
      end: shifted ? s.end : addWeek(s.end),
    })),
    activities: t.activities.map((a) =>
      a.status === "Booked"
        ? a
        : { ...a, date: shifted ? a.date : addWeek(a.date) },
    ),
    expenses: t.expenses.map((e) =>
      e.bookingStatus === "Booked" || e.paid || e.refunded || e.reference
        ? e
        : { ...e, date: shifted ? e.date : addWeek(e.date) },
    ),
    checklist: t.checklist.map((c) => ({
      ...c,
      due: shifted ? c.due : addWeek(c.due),
    })),
    transport,
    fareGroups: t.fareGroups?.map((g) =>
      hasHistory(g)
        ? g
        : { ...g, quoteStatus: "Older estimate — requote needed" },
    ),
    layovers: t.layovers?.map((l) =>
      l.connectionOnly
        ? l
        : {
            ...l,
            date: "",
            arrivalTime: "",
            departureTime: "",
            arrivalTerminal: "",
            departureTerminal: "",
            needsReconfirmation: true,
            notes: `${l.notes}\nOld connection retained for history: ${l.date || "undated"}, ${l.arrivalTime}–${l.departureTime}, terminals ${l.arrivalTerminal || "unknown"}/${l.departureTerminal || "unknown"}. Exact return transit date, times, duration and terminals must be reconfirmed for the new journey.`,
          },
    ),
  };
  const outbound = t.transport.filter((r) => routeIs(r, "BOM", "KUL"));
  const outboundGroupId = `${t.id}:feb-outbound`;
  if (
    outbound.length !== 1 ||
    protectedFlight(outbound[0]) ||
    t.fareGroups?.some((g) => g.id === outboundGroupId) ||
    t.transport.some((r) => r.id === `${t.id}:feb-sin-szb`)
  ) {
    warn(
      "Outbound update was not applied because the existing flight is protected, ambiguous or conflicts with an existing connecting ticket. No duplicate ticket was added.",
    );
  } else {
    const old = outbound[0];
    const group: FareGroup = {
      id: outboundGroupId,
      name: "Mumbai → Singapore → Kuala Lumpur Subang (SZB)",
      amount: 22588,
      currency: "INR",
      rate: 1,
      status: "Researching",
      paid: 0,
      refunded: 0,
      reference: "",
      passengers: t.travellers,
      cabin: "Economy Value",
      quoteStatus: "User search quote",
      includeInBudget: !malaysia,
      notes:
        quoteNote +
        " MakeMyTrip · Singapore Airlines. One combined outbound ticket. " +
        (malaysia
          ? "Comparison quote excluded from forecast: the retained ₹35,550 older round-trip estimate overlaps this outbound; obtain a revised full return quote before replacing that estimate."
          : "Count this total once for SQ 423 and SQ 8584."),
    };
    next.fareGroups = [...(next.fareGroups ?? []), group];
    next.transport = next.transport.map((r) =>
      r.id === old.id
        ? quoted(old, {
            fareGroupId: group.id,
            source: "Mumbai (BOM)",
            destination: "Singapore Changi (SIN)",
            provider: "Singapore Airlines",
            number: "SQ 423",
            aircraft: "Airbus A380",
            operatingCarrier: "Singapore Airlines",
            bookingPlatform: "MakeMyTrip",
            fareType: "Economy Value",
            departureDate: "2027-01-23",
            departureTime: "23:35",
            arrivalDate: "2027-01-24",
            arrivalTime: "07:30",
            departureTerminal: "T2",
            arrivalTerminal: "",
            checkedBaggageKg: 25,
            mode: "International flight",
            notes:
              "Arrival terminal unverified; screenshot Terminal 0 is not an actual verified terminal. Flight duration 5h25.",
          })
        : r,
    );
    next.transport.push(
      quoted(blankTransport(), {
        id: `${t.id}:feb-sin-szb`,
        fareGroupId: group.id,
        source: "Singapore Changi (SIN)",
        destination: "Kuala Lumpur Subang (SZB)",
        provider: "Singapore Airlines",
        operatingCarrier: "Scoot",
        number: "SQ 8584",
        aircraft: "Airbus A320neo",
        bookingPlatform: "MakeMyTrip",
        fareType: "Economy Value",
        departureDate: "2027-01-24",
        departureTime: "12:00",
        arrivalDate: "2027-01-24",
        arrivalTime: "13:10",
        departureTerminal: "T1",
        arrivalTerminal: "",
        checkedBaggageKg: 25,
        mode: "International flight",
        notes:
          "Marketing flight SQ 8584, operated by Scoot. Flight duration 1h10. Arrives SZB (Subang), not KUL/KLIA. Confirm terminal and airport-transfer requirements.",
      }),
    );
    next.layovers = [...(next.layovers ?? []), connection(t, group.id)];
  }
  const domestic = t.transport.filter((r) => routeIs(r, "KUL", "LGK"));
  if (
    domestic.length === 1 &&
    !protectedFlight(domestic[0]) &&
    !domestic[0].fareGroupId
  ) {
    const old = domestic[0];
    next.transport = next.transport.map((r) =>
      r.id === old.id
        ? quoted(old, {
            source: "Kuala Lumpur (KUL)",
            destination: "Langkawi (LGK)",
            provider: "AirAsia Berhad",
            number: "AK 6324",
            aircraft: "Airbus A320",
            operatingCarrier: "AirAsia Berhad",
            fareType: "Regular Fare with Luggage 20",
            departureDate: "2027-01-27",
            departureTime: "12:55",
            arrivalDate: "2027-01-27",
            arrivalTime: "14:00",
            departureTerminal: "T2",
            arrivalTerminal: "",
            fare: 3482,
            checkedBaggageKg: 20,
            mode: "Domestic flight",
            refundable: false,
            notes: "Nonstop, 1h05. Non-refundable.",
          })
        : r,
    );
  } else
    warn(
      "KUL → LGK quote not applied: existing record is protected, ambiguous or linked to another ticket.",
    );
  if (!malaysia) {
    const returns = t.transport.filter((r) => routeIs(r, "SIN", "BOM"));
    if (
      returns.length === 1 &&
      !protectedFlight(returns[0]) &&
      !returns[0].decisionId &&
      !returns[0].fareGroupId &&
      !t.transport.some((r) => r.id === `${t.id}:feb-ai2108`)
    ) {
      const old = returns[0],
        decisionId = `${t.id}:feb-return`;
      const shared: Partial<Transport> = {
        decisionId,
        source: "Singapore (SIN)",
        destination: "Mumbai (BOM)",
        provider: "Air India",
        operatingCarrier: "Air India",
        departureDate: "2027-02-03",
        arrivalDate: "2027-02-03",
        fare: 15124,
        mode: "International flight",
      };
      next.transport = next.transport.map((r) =>
        r.id === old.id
          ? quoted(old, {
              ...shared,
              number: "AI 2106",
              aircraft: "Airbus A321",
              departureTime: "09:40",
              arrivalTime: "12:50",
              departureTerminal: "T2",
              arrivalTerminal: "T2",
              fareType: "ECO VALUE",
              checkedBaggageKg: 25,
              selectedAlternative: false,
              refundable: false,
              notes:
                "Option A · nonstop 5h40. Cancellation fees apply; verify exact rules before booking.",
            })
          : r,
      );
      next.transport.push(
        quoted(blankTransport(), {
          ...shared,
          id: `${t.id}:feb-ai2108`,
          number: "AI 2108",
          aircraft: "",
          departureTime: "19:40",
          arrivalTime: "23:25",
          departureTerminal: "",
          arrivalTerminal: "",
          fareType: "",
          cabinClass: "",
          cabinBaggagePieces: null,
          cabinBaggageKg: null,
          checkedBaggageKg: null,
          selectedAlternative: true,
          notes:
            "Option B preferred · nonstop 6h15. ₹15,124 is user-reported as equal to Option A; aircraft, terminals, cabin class, baggage and fare conditions remain unverified.",
        }),
      );
    } else
      warn(
        "SIN → BOM alternatives not applied: an existing return is protected, ambiguous or already belongs to another decision. No duplicate return was added.",
      );
  }
  next = { ...next, flightUpdateConflicts: conflicts };
  return next;
}
export function migrateStore(s: Store): Store {
  const trips = s.trips.map((t) =>
    s.trips.filter((other) => other.name === t.name && eligible(other)).length >
    1
      ? t
      : updateFebruaryTrip(t),
  );
  return trips.every((t, i) => t === s.trips[i]) ? s : { ...s, trips };
}
export function selectFlightAlternative(t: Trip, id: string): Trip {
  const choice = t.transport.find((r) => r.id === id);
  if (!choice?.decisionId) return t;
  const options = t.transport.filter((r) => r.decisionId === choice.decisionId);
  if (options.some(hasHistory))
    throw Error(
      "A return option has booking/payment history; reconcile it before changing selection.",
    );
  return {
    ...t,
    transport: t.transport.map((r) =>
      r.decisionId === choice.decisionId
        ? { ...r, selectedAlternative: r.id === id }
        : r,
    ),
  };
}
export function accommodationNeedsReview(t: Trip) {
  return t.hotels.some(
    (h) =>
      h.status !== "Cancelled" &&
      !t.stops.some(
        (s) =>
          s.name === h.destination &&
          s.start === h.checkIn &&
          s.end === h.checkOut,
      ),
  );
}
