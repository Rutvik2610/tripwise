import type { Trip } from "./model";
import { addWeek } from "./februaryFlights";

// Source-data correction only. Never applied to localStorage or imported plans.
// A hotel is eligible only when it exactly matches a destination's former stay.
export function correctDefaultHotelDates(t: Trip): Trip {
  if (t.start !== "2027-01-23" || t.end !== "2027-02-03") return t;
  const hotels = t.hotels.map((h) => {
    const match = t.stops.some(
      (s) =>
        s.name === h.destination &&
        addWeek(h.checkIn) === s.start &&
        addWeek(h.checkOut) === s.end,
    );
    return match
      ? { ...h, checkIn: addWeek(h.checkIn), checkOut: addWeek(h.checkOut) }
      : h;
  });
  return hotels.every((h, i) => h === t.hotels[i]) ? t : { ...t, hotels };
}
