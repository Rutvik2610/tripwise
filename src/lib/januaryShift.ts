import type { Store, Trip } from "./model";
import { previousDay } from "./januaryDates";
import { isOutbound } from "./transit";

const names = [
  "Malaysia + Singapore Solo Trip 2027",
  "Malaysia only · Three islands & cities",
];
// Exact original template identity plus route and seeded-record evidence. Dates
// alone never identify a trip. Copies/custom trips do not match this signature.
function originalScenario(t: Trip) {
  const index = names.indexOf(t.name);
  if (index < 0 || !/mumbai/i.test(t.departure)) return false;
  const route = t.stops.map((s) => s.name.toLowerCase());
  const required = [
    "kuala lumpur",
    "langkawi",
    index === 1 ? "penang" : "singapore",
  ];
  return (
    required.every((s) => route.includes(s)) &&
    !route.includes(index === 1 ? "singapore" : "penang") &&
    (t.hotels.some((h) => h.id.startsWith(`${t.id}:hotel:`)) ||
      (t.hotels.some(
        (h) => h.name === "Kuala Lumpur · accommodation allowance",
      ) &&
        t.activities.some((a) => a.name === "SkyCab")))
  );
}

// Replace explicit itinerary dates only, never prices, booking references or URLs.
// One regex pass means adjacent date values cannot be shifted twice.
export function shiftDateText(value: string): string {
  const months: Record<string, number> = {
    january: 1,
    jan: 1,
    december: 12,
    dec: 12,
  };
  return value.replace(
    /\b\d{4}-\d{2}-\d{2}\b|\b(\d{1,2})(?:\s*([–−-])\s*(\d{1,2}))?\s+(January|Jan|December|Dec)(?:\s+(\d{4}))?\b/gi,
    (
      match,
      first: string,
      dash: string,
      last: string,
      month: string,
      year: string,
    ) => {
      if (/^\d{4}-/.test(match))
        return /^(2027-01|2026-12)-/.test(match) ? previousDay(match) : match;
      if (year && !["2026", "2027"].includes(year)) return match;
      const m = months[month.toLowerCase()];
      const y = year || (m === 12 ? "2026" : "2027");
      const shift = (day: string) =>
        previousDay(
          `${y}-${String(m).padStart(2, "0")}-${day.padStart(2, "0")}`,
        );
      const a = shift(first),
        b = last ? shift(last) : a;
      const label = (date: string) =>
        `${Number(date.slice(8))} ${date.slice(5, 7) === "12" ? "December" : date.slice(5, 7) === "01" ? "January" : new Date(date + "T00:00:00Z").toLocaleString("en", { month: "long", timeZone: "UTC" })}`;
      if (last && a.slice(0, 7) === b.slice(0, 7))
        return `${Number(a.slice(8))}${dash}${label(b)}${year ? ` ${b.slice(0, 4)}` : ""}`;
      return `${label(a)}${last ? ` ${a.slice(0, 4)}${dash}${label(b)}` : ""}${year ? ` ${b.slice(0, 4)}` : ""}`;
    },
  );
}
const note = <T extends { notes: string }>(r: T): T => ({
  ...r,
  notes: shiftDateText(r.notes),
});

export function shiftJanuaryTrip(t: Trip): Trip {
  if (t.january2027Shift === 1 || !originalScenario(t)) return t;
  // An already-shifted backup without the new marker is adopted, never shifted.
  if (t.start === "2027-01-17" && t.end === "2027-01-27")
    return { ...t, january2027Shift: 1 };
  if (t.start !== "2027-01-18" || t.end !== "2027-01-28") return t;
  const malaysia = t.name === names[1];
  const scheduleNote =
    "Dates shifted one calendar day for planning; schedule has not been independently reverified. Existing booking and payment status retained.";
  return {
    ...t,
    january2027Shift: 1,
    start: previousDay(t.start),
    end: previousDay(t.end),
    stops: t.stops.map((s) => ({
      ...s,
      start: previousDay(s.start),
      end: previousDay(s.end),
    })),
    hotels: t.hotels.map((h) => ({
      ...note(h),
      checkIn: previousDay(h.checkIn),
      checkOut: previousDay(h.checkOut),
      cancellationDeadline: previousDay(h.cancellationDeadline),
    })),
    transport: t.transport.map((r) => {
      // Older templates put arrival day in departureDate and leave arrival blank.
      // Reconcile only this known placeholder, preserving genuine overnight dates.
      const placeholder =
        isOutbound(r) && r.departureDate === "2027-01-18" && !r.arrivalDate;
      return {
        ...note(r),
        departureDate: placeholder
          ? "2027-01-16"
          : previousDay(r.departureDate),
        arrivalDate: placeholder ? "2027-01-17" : previousDay(r.arrivalDate),
        notes: `${shiftDateText(r.notes)}\n${scheduleNote}`,
      };
    }),
    activities: t.activities.map((a) => ({
      ...note(a),
      name: shiftDateText(a.name),
      date: previousDay(a.date),
    })),
    expenses: t.expenses.map((e) => ({
      ...note(e),
      description: shiftDateText(e.description),
      date: previousDay(e.date),
    })),
    checklist: t.checklist.map((c) => ({
      ...note(c),
      title: shiftDateText(c.title),
      due: previousDay(c.due),
    })),
    ...(t.fareGroups ? { fareGroups: t.fareGroups.map(note) } : {}),
    ...(t.layovers
      ? {
          layovers: t.layovers.map((l) => ({
            ...note(l),
            date: l.date
              ? previousDay(l.date)
              : malaysia && l.direction !== "Outbound"
                ? "2027-01-27"
                : "",
            direction:
              malaysia && l.direction === "Unknown" ? "Inbound" : l.direction,
          })),
        }
      : {}),
  };
}

export function migrateStore(s: Store): Store {
  const trips = s.trips.map((t) =>
    !t.january2027Shift &&
    s.trips.filter((other) => other.name === t.name && originalScenario(other))
      .length > 1
      ? t
      : shiftJanuaryTrip(t),
  );
  return trips.every((t, i) => t === s.trips[i]) ? s : { ...s, trips };
}
