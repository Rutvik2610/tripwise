import { migrateStore } from "./februaryFlights";
import { z } from "zod";
import type { Store } from "./model";
import {
  bookingStatuses,
  categories,
  currencies,
  paymentStatuses,
} from "./model";
const str = z.string().max(10000),
  id = z.string().min(1).max(100),
  num = z.number().finite().min(0).max(1e10),
  date = z.union([z.literal(""), z.iso.date()]);
const currency = z.enum(currencies),
  status = z.enum(bookingStatuses as [string, ...string[]]);
const expense = z.object({
  layoverId: id.optional(),
  sourceActivityId: id.optional(),
  includeInBudget: z.boolean().optional(),
  costPending: z.boolean().optional(),
  id,
  description: str.min(1),
  destination: str,
  category: z.enum(categories as [string, ...string[]]),
  date,
  currency,
  amount: num,
  rate: num.positive(),
  paid: num,
  refunded: num,
  paymentStatus: z.enum(paymentStatuses as [string, ...string[]]),
  bookingStatus: status,
  refundable: z.boolean(),
  reference: str,
  vendor: str,
  url: str,
  notes: str,
  receipt: str,
});
const hotel = z.object({
  id,
  name: str.min(1),
  destination: str,
  checkIn: date,
  checkOut: date,
  room: str,
  currency,
  rate: num.positive(),
  nightly: num.nullable(),
  taxes: num,
  propertyTaxBasis: z.enum(["Per night", "Whole stay"]).optional(),
  tourismTax: num,
  heritageTax: num,
  propertyFees: num,
  taxMode: z.enum(["Included", "Separate"]),
  breakfast: z.boolean(),
  freeCancellation: z.boolean(),
  cancellationDeadline: date,
  bathroom: z.boolean(),
  window: z.boolean(),
  rating: num.max(10).nullable(),
  cleanliness: num.max(10).nullable(),
  distance: num.nullable(),
  website: str,
  url: str,
  notes: str,
  status,
  selected: z.boolean(),
  paid: num,
  refunded: num,
});
const time = z.union([
  z.literal(""),
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
]);
const transport = z.object({
  decisionId: id.optional(),
  selectedAlternative: z.boolean().optional(),
  aircraft: str.optional(),
  operatingCarrier: str.optional(),
  fareType: str.optional(),
  bookingPlatform: str.optional(),
  cabinClass: str.optional(),
  quoteStatus: z
    .enum(["User search quote", "Older estimate — requote needed"])
    .optional(),
  cabinBaggagePieces: num.int().max(100).nullable().optional(),
  cabinBaggageKg: num.max(1000).nullable().optional(),
  checkedBaggageKg: num.max(1000).nullable().optional(),
  fareGroupId: id.optional(),
  id,
  source: str.min(1),
  destination: str.min(1),
  departureDate: date,
  departureTime: time,
  arrivalDate: date,
  arrivalTime: time,
  mode: z.enum([
    "International flight",
    "Domestic flight",
    "Regional flight",
    "Bus",
    "Train",
    "Ferry",
    "Taxi",
    "Grab",
    "Airport shuttle",
  ]),
  provider: str,
  number: str,
  departureTerminal: str,
  arrivalTerminal: str,
  currency,
  rate: num.positive(),
  fare: num,
  taxes: num,
  baggage: num,
  seat: num,
  refundable: z.boolean(),
  reference: str,
  url: str,
  status,
  paid: num,
  refunded: num,
  notes: str,
});
const activity = z.object({
  retiredTransit: z.boolean().optional(),
  layoverId: id.optional(),
  includeInBudget: z.boolean().optional(),
  costPending: z.boolean().optional(),
  id,
  name: str.min(1),
  date,
  start: time,
  end: time,
  destination: str,
  category: z.enum([
    "Sightseeing",
    "Culture",
    "Nature",
    "Adventure",
    "Shopping",
    "Food",
    "Relaxation",
    "Transportation",
  ]),
  cost: num,
  bookingRequired: z.boolean(),
  transport: str,
  notes: str,
  status: z.enum(["Planned", "Booked", "Completed", "Cancelled"]),
});
const check = z.object({
  id,
  title: str.min(1),
  status: z.enum(["To do", "In progress", "Done"]),
  priority: z.enum(["Low", "Medium", "High"]),
  due: date,
  notes: str,
  related: str,
});
const stop = z.object({
  id,
  name: str.min(1),
  country: str,
  start: date,
  end: date,
});
const fareGroup = z.object({
  includeInBudget: z.boolean().optional(),
  quoteStatus: z
    .enum(["User search quote", "Older estimate — requote needed"])
    .optional(),
  id,
  name: str.min(1),
  amount: num,
  currency,
  rate: num.positive(),
  status,
  paid: num,
  refunded: num,
  reference: str,
  notes: str,
  passengers: num.int().min(1).max(100),
  cabin: str,
});
const layover = z.object({
  connectionOnly: z.boolean().optional(),
  needsReconfirmation: z.boolean().optional(),
  id,
  fareGroupId: id.optional(),
  airport: z.literal("SIN"),
  timezone: z.literal("Asia/Singapore"),
  date,
  direction: z.enum(["Unknown", "Outbound", "Inbound"]),
  arrivalTime: time,
  departureTime: time,
  arrivalTerminal: str,
  departureTerminal: str,
  entry: z.enum([
    "Verification pending",
    "Verified permitted",
    "Not permitted",
  ]),
  baggage: z.enum(["Unknown", "Yes", "No"]),
  protectedConnection: z.enum(["Unknown", "Yes", "No"]),
  additionalCheckIn: z.enum(["Unknown", "Yes", "No"]),
  option: z.enum(["Undecided", "Airport", "City"]),
  disembarkation: num.int().max(1440).nullable(),
  immigration: num.int().max(1440).nullable(),
  travelOut: num.int().max(1440).nullable(),
  travelBack: num.int().max(1440).nullable(),
  formalities: num.int().max(1440).nullable(),
  baggageCheckIn: num.int().max(1440).nullable(),
  safetyBuffer: num.int().max(1440).nullable(),
  airlineUrl: str,
  notes: str,
});
const trip = z.object({
  february2027Revision: z.literal(1).optional(),
  plannedNights: num.int().max(3650).optional(),
  flightUpdateConflicts: z.array(str).max(1000).optional(),
  january2027Shift: z.literal(1).optional(),
  malaysiaPlanRevision: z.literal(2).optional(),
  fareGroups: z.array(fareGroup).max(1000).optional(),
  layovers: z.array(layover).max(1000).optional(),
  id,
  name: str.min(1),
  departure: str,
  start: date,
  end: date,
  travellers: num.int().min(1).max(100),
  homeCurrency: currency,
  budget: num,
  stretch: num,
  accommodationBudget: num,
  status: z.enum(["Planning", "Confirmed", "In Progress", "Completed"]),
  archived: z.boolean(),
  stops: z.array(stop).max(100),
  expenses: z.array(expense).max(10000),
  hotels: z.array(hotel).max(10000),
  transport: z.array(transport).max(10000),
  activities: z.array(activity).max(10000),
  checklist: z.array(check).max(10000),
  simulation: z.object({
    preset: z.enum(["Budget", "Balanced", "Comfortable", "Custom"]),
    nights: num.int().max(3650),
    nightly: num,
    flights: num,
    food: num,
    transport: num,
    attractions: num,
    contingency: num.max(100),
  }),
});
export const schemas = {
  fareGroups: fareGroup,
  layovers: layover,
  expenses: expense,
  hotels: hotel,
  transport,
  activities: activity,
  checklist: check,
  stops: stop,
  trip,
};
const schema = z.object({
  version: z.literal(1),
  trips: z.array(trip).min(1).max(100),
  activeId: id,
  rates: z.object({
    INR: z.literal(1),
    MYR: num.positive(),
    SGD: num.positive(),
    USD: num.positive(),
  }),
  theme: z.enum(["light", "dark"]),
});
export function validate(raw: unknown): Store {
  const s = schema.parse(raw);
  const ids = new Set<string>();
  for (const t of s.trips) {
    for (const entry of [
      t,
      ...t.stops,
      ...t.expenses,
      ...t.hotels,
      ...t.transport,
      ...t.activities,
      ...t.checklist,
      ...(t.fareGroups ?? []),
      ...(t.layovers ?? []),
    ]) {
      if (ids.has(entry.id)) throw Error("Duplicate record IDs in backup.");
      ids.add(entry.id);
    }
    const decisions = new Set(
      t.transport.flatMap((r) => (r.decisionId ? [r.decisionId] : [])),
    );
    for (const decision of decisions) {
      const options = t.transport.filter((r) => r.decisionId === decision);
      if (options.some((r) => r.fareGroupId))
        throw Error("Flight alternatives cannot also be ticket segments.");
      if (
        options.filter((r) => r.selectedAlternative && r.status !== "Cancelled")
          .length !== 1
      )
        throw Error(
          "Choose exactly one active alternative for each flight decision.",
        );
      if (
        options.some(
          (r) =>
            !r.selectedAlternative &&
            (r.paid || r.refunded || r.status === "Booked" || r.reference),
        )
      )
        throw Error(
          "A flight with booking/payment history cannot be deselected.",
        );
    }
    const groupIds = new Set((t.fareGroups ?? []).map((g) => g.id));
    for (const g of t.fareGroups ?? []) {
      if (g.refunded > g.paid)
        throw Error("Ticket refunds cannot exceed payments.");
      if (g.currency === "INR" && g.rate !== 1)
        throw Error("INR ticket rate must be 1.");
    }
    for (const r of t.transport)
      if (r.fareGroupId) {
        if (!groupIds.has(r.fareGroupId))
          throw Error("Flight references a missing fare group.");
        if (
          r.fare ||
          r.taxes ||
          r.baggage ||
          r.seat ||
          r.paid ||
          r.refunded ||
          r.status === "Booked" ||
          r.reference
        )
          throw Error(
            "Linked legs must keep fares, bookings and payments at ticket level; leg allocation is unknown.",
          );
      }
    for (const l of t.layovers ?? [])
      if (l.fareGroupId && !groupIds.has(l.fareGroupId))
        throw Error("Transit references a missing ticket.");
    for (const a of t.activities)
      if (a.layoverId && !(t.layovers ?? []).some((l) => l.id === a.layoverId))
        throw Error("Activity references a missing layover.");
    if (!t.start || !t.end || t.end < t.start)
      throw Error("Invalid trip date range.");
    if ((Date.parse(t.end) - Date.parse(t.start)) / 86400000 > 729)
      throw Error("Trip duration cannot exceed 730 days.");
    for (const stop of t.stops)
      if (stop.start && stop.end && stop.end < stop.start)
        throw Error("Destination departure must follow arrival.");
    for (const a of t.activities)
      if (a.start && a.end && a.end < a.start)
        throw Error("Activity end must follow its start on the same day.");
    for (const h of t.hotels)
      if (h.status === "Booked" && !h.selected)
        throw Error("A booked hotel must be selected for its stay.");
    for (const record of [...t.expenses, ...t.hotels, ...t.transport])
      if (record.currency === "INR" && record.rate !== 1)
        throw Error("INR records must use an exchange rate of 1.");
    for (const h of t.hotels) {
      if (!h.checkIn || !h.checkOut || h.checkOut <= h.checkIn)
        throw Error("Hotel checkout must follow check-in.");
      if (h.refunded > h.paid) throw Error("Refund cannot exceed payment.");
    }
    const stays = new Set<string>();
    for (const h of t.hotels.filter((h) => h.selected)) {
      const key = h.destination + "|" + h.checkIn + "|" + h.checkOut;
      if (stays.has(key))
        throw Error("More than one selected hotel for a stay.");
      stays.add(key);
    }
    for (const e of [...t.expenses, ...t.transport])
      if (e.refunded > e.paid) throw Error("Refund cannot exceed payment.");
  }
  if (!s.trips.some((t) => t.id === s.activeId))
    throw Error("Active trip does not exist.");
  return s;
}
export const storageKey = "tripwise.v1";
export function load(): { data: Store | null; error: string } {
  try {
    const raw = localStorage.getItem(storageKey);
    return {
      data: raw ? validate(migrateStore(validate(JSON.parse(raw)))) : null,
      error: "",
    };
  } catch {
    return {
      data: null,
      error:
        "Saved data could not be read. It has not been overwritten. Export the recovery copy before resetting or importing a valid backup.",
    };
  }
}
export function save(s: Store) {
  localStorage.setItem(storageKey, JSON.stringify(s));
}

export function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(" → ") || "Backup"}: ${issue.message}`)
      .join(". ");
  return error instanceof Error ? error.message : "Please check the fields.";
}
