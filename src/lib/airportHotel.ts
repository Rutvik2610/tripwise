import type { Trip } from "./model";
import { blankHotel } from "./factories";
import { isMalaysiaOnly } from "./transit";

// Additive update for fresh plans and existing backups. Never reprice or replace
// a matching user record, including one with booking/payment history.
export function addAirportHotel(t: Trip): Trip {
  if (!isMalaysiaOnly(t)) return t;
  const id = `${t.id}:hotel:tune-klia-final`;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (
    t.hotels.some(
      (h) =>
        h.id === id ||
        (h.checkIn === "2027-01-27" &&
          h.checkOut === "2027-01-28" &&
          normalize(h.name).includes("tunehotel") &&
          normalize(h.name).includes("klia")),
    )
  )
    return t;
  return {
    ...t,
    hotels: [
      ...t.hotels,
      {
        ...blankHotel(),
        id,
        name: "Tune Hotel KLIA-KLIA2",
        destination: "Kuala Lumpur",
        checkIn: "2027-01-27",
        checkOut: "2027-01-28",
        nightly: 5302,
        taxes: 1948,
        taxMode: "Separate",
        status: "Researching",
        notes:
          "Location: Kuala Lumpur International Airport, Terminal 2 (KUL T2). User-supplied INR estimate: ₹5,302 base + ₹1,948 taxes and fees = ₹7,250 for the whole stay. Taxes are included in this total; do not add them again. Unverified, not booked and unpaid. Candidate for the overnight stay before the planned 06:55 international departure on 28 January 2027; flight time and departure terminal require verification. Room, amenities and booking conditions unverified.",
      },
    ],
  };
}
