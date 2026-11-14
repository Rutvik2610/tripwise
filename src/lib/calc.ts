import type { Expense, Hotel, Transport, Trip } from "./model";
export const daysBetween = (start: string, end: string) =>
  Math.max(
    0,
    Math.round(
      (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) /
        86400000,
    ),
  ) || 0;
export const convert = (amount: number, rate: number) =>
  Math.round(amount * rate * 100) / 100;
export const netPaid = (paid: number, refunded: number) =>
  Math.max(0, paid - refunded);
// Missing basis denotes legacy whole-stay amounts. Payment location never adds
// an independent expense: property charges are included exactly once in total.
export function hotelBreakdown(h: Hotel) {
  const nights = daysBetween(h.checkIn, h.checkOut);
  const multiplier = h.propertyTaxBasis === "Per night" ? nights : 1;
  const room = h.nightly === null ? null : convert(h.nightly * nights, h.rate);
  const generalTax = convert(h.taxMode === "Separate" ? h.taxes : 0, h.rate);
  const tourismTax = convert(h.tourismTax * multiplier, h.rate);
  const heritageTax = convert(h.heritageTax * multiplier, h.rate);
  const propertyFees = convert(h.propertyFees, h.rate);
  const atProperty = convert(tourismTax + heritageTax + propertyFees, 1);
  const bookingSubtotal = room === null ? null : convert(room + generalTax, 1);
  return {
    nights,
    room,
    generalTax,
    tourismTax,
    heritageTax,
    propertyFees,
    atProperty,
    bookingSubtotal,
    total:
      bookingSubtotal === null
        ? null
        : convert(bookingSubtotal + atProperty, 1),
  };
}
export const hotelTotal = (h: Hotel) => hotelBreakdown(h).total;
export const transportTotal = (t: Transport) =>
  convert(t.fare + t.taxes + t.baggage + t.seat, t.rate);
export const expenseTotal = (e: Expense) => convert(e.amount, e.rate);
export const paymentState = (total: number, paid: number, refunded: number) =>
  refunded >= paid && refunded > 0
    ? "Refunded"
    : netPaid(paid, refunded) >= total && total > 0
      ? "Paid"
      : netPaid(paid, refunded) > 0
        ? "Partially Paid"
        : "Unpaid";
export interface LedgerRow {
  id: string;
  label: string;
  category: string;
  destination: string;
  date: string;
  total: number;
  paid: number;
  booked: boolean;
  active: boolean;
}
export function ledger(t: Trip): LedgerRow[] {
  return [
    ...t.expenses.map((e) => ({
      id: e.id,
      label: e.description,
      category: e.category,
      destination: e.destination,
      date: e.date,
      total: expenseTotal(e),
      paid: netPaid(e.paid, e.refunded),
      booked: e.bookingStatus === "Booked",
      active: e.bookingStatus !== "Cancelled",
    })),
    ...t.hotels.map((h) => ({
      id: h.id,
      label: h.name,
      category: "Hotels",
      destination: h.destination,
      date: h.checkIn,
      total: hotelTotal(h) ?? 0,
      paid: netPaid(h.paid, h.refunded),
      booked: h.selected && h.status === "Booked",
      active: h.selected && h.status !== "Cancelled",
    })),
    ...t.transport.map((x) => ({
      id: x.id,
      label: `${x.source} → ${x.destination}`,
      category:
        x.mode === "International flight"
          ? "International flights"
          : x.mode.includes("flight")
            ? "Domestic/regional flights"
            : x.mode === "Airport shuttle"
              ? "Airport transfers"
              : "Local transportation",
      destination: x.destination,
      date: x.departureDate,
      total: transportTotal(x),
      paid: netPaid(x.paid, x.refunded),
      booked: x.status === "Booked",
      active: x.status !== "Cancelled",
    })),
    ...t.activities.map((a) => ({
      id: a.id,
      label: a.name,
      category:
        a.category === "Adventure"
          ? "Adventure activities"
          : a.category === "Food"
            ? "Food"
            : a.category === "Shopping"
              ? "Shopping"
              : a.category === "Transportation"
                ? "Local transportation"
                : "Attractions",
      destination: a.destination,
      date: a.date,
      total: a.cost,
      paid: 0,
      booked: a.status === "Booked",
      active: a.status !== "Cancelled",
    })),
  ];
}
export function totals(t: Trip) {
  const all = ledger(t),
    rows = all.filter((r) => r.active);
  const estimated = all.reduce(
      (s, r) => s + (r.active ? Math.max(r.total, r.paid) : r.paid),
      0,
    ),
    confirmed = rows.filter((r) => r.booked).reduce((s, r) => s + r.total, 0),
    paid = all.reduce((s, r) => s + r.paid, 0);
  return {
    estimated,
    confirmed,
    paid,
    unpaid: rows
      .filter((r) => r.booked)
      .reduce((s, r) => s + Math.max(0, r.total - r.paid), 0),
    remaining: t.budget - estimated,
    bookings: rows.filter((r) => r.booked).length,
    days: daysBetween(t.start, t.end) + 1,
    nights: daysBetween(t.start, t.end),
    hotels: all
      .filter((r) => r.category === "Hotels")
      .reduce((s, r) => s + (r.active ? Math.max(r.total, r.paid) : r.paid), 0),
  };
}
export function groupBy(t: Trip, key: "category" | "destination" | "date") {
  const map = new Map<
    string,
    { name: string; estimated: number; paid: number }
  >();
  ledger(t).forEach((r) => {
    const name = r[key] || "Unscheduled";
    const v = map.get(name) ?? { name, estimated: 0, paid: 0 };
    v.estimated += r.active ? Math.max(r.total, r.paid) : r.paid;
    v.paid += r.paid;
    map.set(name, v);
  });
  return [...map.values()];
}
export const stayKey = (h: Hotel) =>
  `${h.destination}|${h.checkIn}|${h.checkOut}`;
export function selectHotel(t: Trip, id: string): Trip {
  const selected = t.hotels.find((h) => h.id === id);
  if (!selected) return t;
  return {
    ...t,
    hotels: t.hotels.map((h) => ({
      ...h,
      selected:
        h.id === id
          ? true
          : stayKey(h) === stayKey(selected)
            ? false
            : h.selected,
    })),
  };
}
export function savings(t: Trip) {
  return t.hotels
    .filter(
      (h) =>
        h.selected &&
        h.status !== "Cancelled" &&
        h.status !== "Booked" &&
        h.paid === 0,
    )
    .reduce((sum, h) => {
      const price = hotelTotal(h);
      const others = t.hotels
        .filter((o) => stayKey(o) === stayKey(h) && o.status !== "Cancelled")
        .map(hotelTotal)
        .filter((v): v is number => v !== null);
      return (
        sum + (price === null ? 0 : Math.max(0, price - Math.min(...others)))
      );
    }, 0);
}
export function simulate(t: Trip) {
  const s = t.simulation;
  const base =
    s.nights * s.nightly +
    s.flights +
    (s.food + s.transport) * (daysBetween(t.start, t.end) + 1) +
    s.attractions;
  return {
    base,
    total: convert(base, 1 + s.contingency / 100),
    contingency: convert(base, s.contingency / 100),
  };
}
export function travelMinutes(t: Transport) {
  if (!t.departureTime || !t.arrivalTime || !t.arrivalDate) return null;
  const offset = (place: string) =>
    /mumbai|bom|india/i.test(place) ? "+05:30" : "+08:00";
  return (
    (Date.parse(`${t.arrivalDate}T${t.arrivalTime}${offset(t.destination)}`) -
      Date.parse(`${t.departureDate}T${t.departureTime}${offset(t.source)}`)) /
    60000
  );
}
export function connectionWarnings(items: Transport[]) {
  const sorted = items
    .filter(
      (t) =>
        t.departureTime &&
        t.arrivalTime &&
        t.arrivalDate &&
        t.status !== "Cancelled",
    )
    .sort((a, b) =>
      (a.departureDate + a.departureTime).localeCompare(
        b.departureDate + b.departureTime,
      ),
    );
  return sorted.slice(1).flatMap((t, i) => {
    const prev = sorted[i];
    const gap =
      (Date.parse(`${t.departureDate}T${t.departureTime}`) -
        Date.parse(`${prev.arrivalDate}T${prev.arrivalTime}`)) /
      60000;
    const airportChange =
      (/KUL/i.test(prev.destination) && /SZB/i.test(t.source)) ||
      (/SZB/i.test(prev.destination) && /KUL/i.test(t.source));
    return gap >= 0 && gap < 1440
      ? [
          `${prev.destination} → ${t.source}: ${Math.floor(gap / 60)}h ${gap % 60}m connection${gap < 180 ? " · Below conservative 3-hour buffer" : ""}${airportChange ? " · Airport change (KUL / SZB)" : ""}. Verify transfers and separate-ticket protection.`,
        ]
      : [];
  });
}
export function insights(t: Trip) {
  const s = totals(t);
  const out = [
    s.remaining < 0
      ? `Projected spending exceeds your budget by ₹${Math.round(-s.remaining).toLocaleString("en-IN")}.`
      : `You have ₹${Math.round(s.remaining).toLocaleString("en-IN")} of planning headroom.`,
  ];
  if (savings(t) > 0)
    out.push(
      `Selecting the cheapest hotel for each stay could save ₹${savings(t).toLocaleString("en-IN")}.`,
    );
  const singapore = t.hotels
    .filter((h) => h.selected && h.destination === "Singapore")
    .reduce((s, h) => s + (hotelTotal(h) ?? 0), 0);
  if (s.hotels > 0 && singapore / s.hotels > 0.4)
    out.push(
      `Singapore represents ${Math.round((singapore / s.hotels) * 100)}% of your selected accommodation costs.`,
    );
  const keys = new Set(t.hotels.map(stayKey));
  keys.forEach((key) => {
    const hs = t.hotels.filter((h) => stayKey(h) === key);
    if (hs.length > 1)
      out.push(
        `${hs.length} options for ${hs[0].destination}; only a selected hotel counts.`,
      );
  });
  return out;
}
