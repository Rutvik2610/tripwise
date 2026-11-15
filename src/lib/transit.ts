import type { Layover, Transport, Trip } from "./model";
import { blankActivity, blankCheck, blankTransport } from "./factories";
import { convert, ledger } from "./calc";
const normal = (s: string) => s.toLowerCase();
export const isMalaysiaOnly = (t: Trip) =>
  ((t.start === "2027-01-18" && t.end === "2027-01-28") ||
    (t.january2027Shift === 1 &&
      t.start === "2027-01-17" &&
      t.end === "2027-01-27")) &&
  ["Kuala Lumpur", "Langkawi", "Penang"].every((name) =>
    t.stops.some((s) => s.name.toLowerCase() === name.toLowerCase()),
  ) &&
  !t.stops.some((s) => s.name.toLowerCase() === "singapore");
const at = (place: string, code: string, city: string) => {
  const explicit = place.match(/\(([A-Za-z]{3})\)/)?.[1];
  return explicit
    ? explicit.toUpperCase() === code
    : new RegExp(`\\b${code}\\b`, "i").test(place) ||
        normal(place).includes(city);
};
export const isOutbound = (r: Transport) =>
  at(r.source, "BOM", "mumbai") && at(r.destination, "KUL", "kuala lumpur");
export const isInbound = (r: Transport) =>
  at(r.source, "KUL", "kuala lumpur") && at(r.destination, "BOM", "mumbai");
const isOldReturn = (r: Transport) =>
  at(r.source, "PEN", "penang") && at(r.destination, "BOM", "mumbai");
const protectedFlight = (r: Transport) =>
  r.status === "Booked" ||
  r.status === "Cancelled" ||
  r.paid > 0 ||
  r.refunded > 0 ||
  !!r.reference ||
  !!r.fareGroupId;
const defaultFare = (r: Transport, amount: number) =>
  r.currency === "INR" &&
  r.rate === 1 &&
  r.fare === amount &&
  r.taxes === 0 &&
  r.baggage === 0 &&
  r.seat === 0 &&
  r.status === "Researching";
export const roundTripTicket = (t: Trip) =>
  t.fareGroups?.find(
    (g) =>
      g.id === `${t.id}:my-return` ||
      g.name === "Mumbai ↔ Kuala Lumpur — round-trip ticket" ||
      (t.transport.some((r) => r.fareGroupId === g.id && isOutbound(r)) &&
        t.transport.some((r) => r.fareGroupId === g.id && isInbound(r))),
  );
export function malaysiaPlanReview(t: Trip) {
  const ticket = roundTripTicket(t);
  const outbound = t.transport.filter(isOutbound),
    inbound = t.transport.filter(isInbound),
    oldReturn = inbound.length ? [] : t.transport.filter(isOldReturn);
  const matched = [...outbound, ...inbound, ...oldReturn];
  const ambiguous =
    outbound.length > 1 || inbound.length > 1 || oldReturn.length > 1;
  const protectedRecords = matched.filter(protectedFlight);
  const needsReview = matched.filter(
    (r) =>
      !protectedFlight(r) &&
      !(isOutbound(r) ? defaultFare(r, 12500) : defaultFare(r, 12000)),
  );
  return {
    ticket,
    outbound: outbound[0],
    inbound: inbound[0],
    oldReturn: oldReturn[0],
    ambiguous,
    protectedRecords,
    needsReview,
    canApply:
      isMalaysiaOnly(t) &&
      !ticket &&
      !ambiguous &&
      !protectedRecords.length &&
      !needsReview.length,
  };
}
export const transitChecklistTitles = [
  "Verify Singapore transit-entry eligibility and obtain the required permission before planning to leave Changi Airport.",
  "Confirm the Singapore layover date and outbound or inbound direction",
  "Confirm baggage is checked through to the final destination",
  "Confirm whether the connection is protected on one ticket",
  "Check additional airline check-in or baggage procedures",
  "Verify current Singapore entry and departure requirements",
  "Complete the SG Arrival Card if required for the intended entry",
  "Check actual arrival and departure flight terminals",
  "Confirm sufficient time to return to Changi before the onward flight",
  "Confirm the Penang → Kuala Lumpur repositioning plan and its price",
];
export function applyMalaysiaPlan(
  t: Trip,
  approveUnpaidRepricing = false,
): Trip {
  if (!isMalaysiaOnly(t)) return t;
  const review = malaysiaPlanReview(t);
  let next = t;
  let ticket = review.ticket;
  if (
    !ticket &&
    !review.ambiguous &&
    !review.protectedRecords.length &&
    (!review.needsReview.length || approveUnpaidRepricing)
  ) {
    ticket = {
      id: `${t.id}:my-return`,
      name: "Mumbai ↔ Kuala Lumpur — round-trip ticket",
      amount: 35550,
      currency: "INR",
      rate: 1,
      status: "Researching",
      paid: 0,
      refunded: 0,
      reference: "",
      passengers: 1,
      cabin: "Economy",
      notes:
        "User-supplied combined return airfare. Individual-leg allocation, airline, baggage allowance, ticket conditions, full schedule and connection protection unknown. Both directions included once.",
    };
    const baseOut = review.outbound ?? {
      ...blankTransport(),
      id: `t-${t.id}-out`,
      source: "Mumbai (BOM)",
      destination: "Kuala Lumpur (KUL)",
      departureDate: "",
    };
    const baseIn = review.inbound ?? {
      ...blankTransport(),
      id: `t-${t.id}-in`,
      source: "Kuala Lumpur (KUL)",
      destination: "Mumbai (BOM)",
      departureDate: "",
    };
    const link = (r: Transport): Transport => ({
      ...r,
      fareGroupId: ticket!.id,
      fare: 0,
      taxes: 0,
      baggage: 0,
      seat: 0,
      notes: `${r.notes}\nPrice now held on round-trip ticket. Individual-leg allocation unknown; zero fields are not a free flight.`,
    });
    let transport = t.transport.map((r) =>
      r.id === review.outbound?.id
        ? link(r)
        : r.id === review.inbound?.id
          ? link(r)
          : r.id === review.oldReturn?.id
            ? {
                ...r,
                status: "Cancelled",
                notes: `${r.notes}\nSuperseded unpaid Penang → Mumbai planning estimate; retained for history. Not a cancelled booking. Return ticket now starts from KUL; Penang → KUL transport still needs planning.`,
              }
            : r,
    );
    if (!review.outbound) transport = [...transport, link(baseOut)];
    if (!review.inbound) transport = [...transport, link(baseIn)];
    next = {
      ...next,
      transport,
      fareGroups: [...(t.fareGroups ?? []), ticket],
    };
  }
  const layoverId = `${t.id}:sin-transit`;
  let layover = next.layovers?.find(
    (l) => l.id === layoverId || l.airport === "SIN",
  );
  if (!layover) {
    layover = {
      id: layoverId,
      ...(ticket ? { fareGroupId: ticket.id } : {}),
      airport: "SIN",
      timezone: "Asia/Singapore",
      date: "",
      direction: "Unknown",
      arrivalTime: "08:15",
      departureTime: "18:50",
      arrivalTerminal: "",
      departureTerminal: "",
      entry: "Verification pending",
      baggage: "Unknown",
      protectedConnection: "Unknown",
      additionalCheckIn: "Unknown",
      option: "Undecided",
      disembarkation: null,
      immigration: null,
      travelOut: null,
      travelBack: null,
      formalities: null,
      baggageCheckIn: null,
      safetyBuffer: null,
      airlineUrl: "",
      notes:
        "Provisional Singapore connection. Traveller reports Indian citizenship and no Singapore visa. Entry eligibility, date, journey direction, terminals, baggage and protection must be confirmed. A long layover does not grant permission to enter Singapore.",
    };
    next = { ...next, layovers: [...(next.layovers ?? []), layover] };
    next = {
      ...next,
      activities: [
        ...next.activities,
        {
          ...blankActivity(),
          id: `${t.id}:sin-excursion`,
          layoverId: layover.id,
          name: "Singapore Layover Sightseeing — 10h 35m Connection",
          date: "",
          start: "",
          end: "",
          destination: "Singapore (transit only)",
          category: "Sightseeing",
          cost: 0,
          costPending: true,
          includeInBudget: false,
          notes:
            "Optional candidates only: Jewel Changi; Marina Bay waterfront, Merlion Park, Gardens by the Bay outdoor areas. No reservations, prices or schedule confirmed. No overnight accommodation.",
          transport:
            "Airport transfer requirements and time allowances pending.",
        },
      ],
    };
  } else if (ticket && !layover.fareGroupId) {
    next = {
      ...next,
      layovers: next.layovers?.map((l) =>
        l.id === layover!.id ? { ...l, fareGroupId: ticket.id } : l,
      ),
    };
  }
  const additions = transitChecklistTitles.filter(
    (title, index) =>
      !next.checklist.some(
        (c) => c.title === title || c.id === `${t.id}:sin-check-${index}`,
      ),
  );
  next = {
    ...next,
    checklist: [
      ...next.checklist,
      ...additions.map((title) => ({
        ...blankCheck(),
        id: `${t.id}:sin-check-${transitChecklistTitles.indexOf(title)}`,
        title,
        priority: "High",
        related: layover!.id,
        notes:
          "Verify current official ICA guidance (https://www.ica.gov.sg/enter-transit-depart) and your airline. No visa, VFTF or entry eligibility is assumed.",
      })),
    ],
  };
  return next;
}
export function layoverMinutes(l: Layover) {
  if (!l.arrivalTime || !l.departureTime) return null;
  const clock = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const difference = clock(l.departureTime) - clock(l.arrivalTime);
  return difference > 0 ? difference : null;
}
export function attachedLayoverLeg(t: Trip, l: Layover) {
  if (!l.date || l.direction === "Unknown" || !l.fareGroupId) return undefined;
  return t.transport.find(
    (r) =>
      r.fareGroupId === l.fareGroupId &&
      (l.direction === "Outbound" ? isOutbound(r) : isInbound(r)),
  );
}
export function sightseeingWindow(l: Layover) {
  const duration = layoverMinutes(l);
  const allowances = [
    l.disembarkation,
    l.immigration,
    l.travelOut,
    l.travelBack,
    l.formalities,
    l.baggageCheckIn,
    l.safetyBuffer,
  ];
  if (
    duration === null ||
    !l.date ||
    l.direction === "Unknown" ||
    l.entry !== "Verified permitted" ||
    l.baggage === "Unknown" ||
    l.protectedConnection === "Unknown" ||
    l.additionalCheckIn === "Unknown" ||
    !l.arrivalTerminal ||
    !l.departureTerminal ||
    l.option === "Undecided" ||
    allowances.some((n) => n === null)
  )
    return null;
  const arrival =
    Number(l.arrivalTime.slice(0, 2)) * 60 + Number(l.arrivalTime.slice(3));
  const start = arrival + l.disembarkation! + l.immigration! + l.travelOut!;
  const end =
    arrival +
    duration -
    l.travelBack! -
    l.formalities! -
    l.baggageCheckIn! -
    l.safetyBuffer!;
  return {
    start,
    end,
    minutes: Math.max(0, end - start),
    conservativeBuffer: l.safetyBuffer! >= 120,
  };
}
export const clockLabel = (n: number) =>
  `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export function transportationTotals(t: Trip) {
  const rows = ledger(t);
  const cost = (category: string) =>
    rows
      .filter((r) => r.category === category)
      .reduce((s, r) => s + (r.active ? Math.max(r.total, r.paid) : r.paid), 0);
  const international = cost("International flights"),
    domestic = cost("Domestic/regional flights"),
    local = cost("Local transportation") + cost("Airport transfers");
  return {
    international,
    domestic,
    local,
    total: convert(international + domestic + local, 1),
  };
}
