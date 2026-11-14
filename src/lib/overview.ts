import {
  daysBetween,
  hotelTotal,
  ledger,
  netPaid,
  stayKey,
  totals,
} from "./calc";
import type { Trip } from "./model";
const normal = (s: string) => s.trim().toLowerCase();
export function accommodationStays(t: Trip) {
  const groups = new Map<
    string,
    { key: string; destination: string; start: string; end: string }
  >();
  for (const s of t.stops) {
    const key = `${normal(s.name)}|${s.start}|${s.end}`;
    groups.set(key, { key, destination: s.name, start: s.start, end: s.end });
  }
  for (const h of t.hotels) {
    const key = `${normal(h.destination)}|${h.checkIn}|${h.checkOut}`;
    if (!groups.has(key))
      groups.set(key, {
        key,
        destination: h.destination,
        start: h.checkIn,
        end: h.checkOut,
      });
  }
  return [...groups.values()].map((stay) => {
    const options = t.hotels.filter(
      (h) =>
        normal(h.destination) === normal(stay.destination) &&
        h.checkIn === stay.start &&
        h.checkOut === stay.end,
    );
    const selected = options.find(
      (h) => h.selected && h.status !== "Cancelled",
    );
    const total = selected ? hotelTotal(selected) : null;
    return {
      ...stay,
      nights: daysBetween(stay.start, stay.end),
      selected,
      total,
      options,
      pending: !selected || total === null,
    };
  });
}
export function costOverview(t: Trip) {
  const summary = totals(t);
  const flightRows = ledger(t).filter((r) =>
    ["International flights", "Domestic/regional flights"].includes(r.category),
  );
  const forecast = (r: ReturnType<typeof ledger>[number]) =>
    r.active ? Math.max(r.total, r.paid) : r.paid;
  const flights = flightRows.reduce((s, r) => s + forecast(r), 0);
  const bookedFlights = flightRows
    .filter((r) => r.active && r.booked)
    .reduce((s, r) => s + forecast(r), 0);
  const hotels = t.hotels
    .filter((h) => h.selected && h.status !== "Cancelled")
    .reduce(
      (s, h) => s + Math.max(hotelTotal(h) ?? 0, netPaid(h.paid, h.refunded)),
      0,
    );
  const stays = accommodationStays(t);
  const pending = stays.filter((s) => s.pending).length;
  const other = summary.estimated - flights - hotels;
  return {
    ...summary,
    flights,
    bookedFlights,
    unbookedFlights: flights - bookedFlights,
    flightCount: flightRows.filter((r) => r.active && !r.isFareGroup).length,
    selectedHotels: hotels,
    flightsAndHotels: flights + hotels,
    other,
    stays,
    pending,
    selectedStays: stays.filter((s) => s.selected).length,
    complete: stays.length > 0 && pending === 0,
    retainedHotelCosts: summary.hotels - hotels,
  };
}
export function hotelDifference(t: Trip, id: string) {
  const h = t.hotels.find((h) => h.id === id);
  if (!h) return null;
  const selected = t.hotels.find(
    (o) => o.selected && o.status !== "Cancelled" && stayKey(o) === stayKey(h),
  );
  if (!selected) return null;
  const price = hotelTotal(h),
    base = hotelTotal(selected);
  return price === null || base === null ? null : price - base;
}
