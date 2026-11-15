import { migrateStore } from "./januaryShift";
import { describe, it, expect } from "vitest";
import { makeTrip, seed } from "./seed";
import { blankTransport, blankExpense } from "./factories";
import {
  correctMalaysiaTrip,
  correctMalaysiaStore,
  airportCode,
  malaysiaCorrectionWarnings,
} from "./malaysiaCorrection";
import {
  transportationTotals,
  roundTripTicket,
  attachedLayoverLeg,
} from "./transit";
import { costOverview, accommodationStays } from "./overview";
import { daysBetween, ledger, totals } from "./calc";
import { validate, load, storageKey } from "./storage";
function previousMalaysia() {
  const t = makeTrip(true);
  delete t.malaysiaPlanRevision;
  t.transport = t.transport.filter(
    (r) =>
      !(
        airportCode(r.source) === "PEN" && airportCode(r.destination) === "KUL"
      ),
  );
  for (const r of t.transport) {
    if (airportCode(r.source) === "KUL" && airportCode(r.destination) === "LGK")
      r.fare = 3500;
    if (airportCode(r.source) === "LGK" && airportCode(r.destination) === "PEN")
      r.fare = 2500;
    if (r.fareGroupId && airportCode(r.source) === "KUL") r.departureDate = "";
  }
  t.transport.push({
    ...blankTransport(),
    id: "previous-pen-bom",
    source: "Penang (PEN)",
    destination: "Mumbai (BOM)",
    departureDate: "2027-01-28",
    fare: 12000,
    status: "Cancelled",
    notes:
      "Superseded unpaid Penang → Mumbai planning estimate. Not a cancelled booking.",
  });
  t.stops = t.stops
    .filter((s) => !(s.name === "Kuala Lumpur" && s.start === "2027-01-27"))
    .map((s) => (s.name === "Penang" ? { ...s, end: "2027-01-28" } : s));
  t.hotels = t.hotels.map((h) =>
    h.destination === "Penang"
      ? { ...h, checkOut: "2027-01-28", notes: "My original Penang notes" }
      : h,
  );
  t.activities = t.activities.map((a) => {
    const copy = { ...a };
    delete copy.retiredTransit;
    return copy;
  });
  return t;
}
describe("Malaysia-only correction revision 2", () => {
  it("has exact quoted flight totals, no obsolete Penang return, and no duplicate ticket fare", () => {
    const t = makeTrip(true);
    expect(roundTripTicket(t)!.amount).toBe(35550);
    expect(transportationTotals(t)).toEqual({
      international: 35550,
      domestic: 9297,
      local: 5000,
      total: 49847,
    });
    expect(costOverview(t).flights).toBe(44847);
    expect(costOverview(t).flightCount).toBe(5);
    expect(
      t.transport.filter(
        (r) =>
          airportCode(r.source) === "PEN" &&
          airportCode(r.destination) === "BOM",
      ),
    ).toHaveLength(0);
    expect(
      t.transport.filter(
        (r) =>
          airportCode(r.source) === "PEN" &&
          airportCode(r.destination) === "KUL",
      ),
    ).toHaveLength(1);
    expect(t.transport.filter((r) => r.fareGroupId)).toHaveLength(2);
  });
  it("shows four distinct planned stays totalling ten nights without selecting a final hotel", () => {
    const t = makeTrip(true);
    expect(t.stops.map((s) => [s.name, s.start, s.end])).toEqual([
      ["Kuala Lumpur", "2027-01-18", "2027-01-21"],
      ["Langkawi", "2027-01-21", "2027-01-24"],
      ["Penang", "2027-01-24", "2027-01-27"],
      ["Kuala Lumpur", "2027-01-27", "2027-01-28"],
    ]);
    expect(
      t.stops.reduce((sum, s) => sum + daysBetween(s.start, s.end), 0),
    ).toBe(10);
    expect(totals(t).days).toBe(11);
    const stays = accommodationStays(t);
    expect(stays.filter((s) => s.destination === "Kuala Lumpur")).toHaveLength(
      2,
    );
    expect(stays.find((s) => s.start === "2027-01-27")).toMatchObject({
      selected: undefined,
      total: null,
      pending: true,
      nights: 1,
    });
    expect(costOverview(t)).toMatchObject({ pending: 1, complete: false });
    expect(t.hotels.some((h) => h.destination === "Singapore")).toBe(false);
  });
  it("applies direct quotes once while retaining IDs, existing dates, provider details, notes and unrelated data", () => {
    const t = previousMalaysia();
    const r = t.transport.find(
      (r) =>
        airportCode(r.source) === "KUL" && airportCode(r.destination) === "LGK",
    )!;
    r.departureDate = "2027-01-22";
    r.provider = "User airline";
    r.number = "User flight";
    r.notes = "Keep my note";
    r.baggage = 300;
    r.taxes = 100;
    const original = structuredClone(t);
    const updated = correctMalaysiaTrip(t);
    expect(t).toEqual(original);
    expect(updated.transport.find((x) => x.id === r.id)).toMatchObject({
      departureDate: "2027-01-22",
      provider: "User airline",
      number: "User flight",
      fare: 3567,
      paid: 0,
      status: "Researching",
    });
    expect(updated.transport.find((x) => x.id === r.id)!.notes).toContain(
      "Keep my note",
    );
    expect(updated.transport.find((x) => x.id === r.id)!.notes).toContain(
      "300 baggage",
    );
    expect(
      malaysiaCorrectionWarnings(updated).some((s) => s.includes("2027-01-22")),
    ).toBe(true);
    expect(updated.expenses).toEqual(t.expenses);
    expect(updated.activities.filter((a) => !a.layoverId)).toEqual(
      t.activities.filter((a) => !a.layoverId),
    );
    expect(
      updated.transport.filter(
        (r) =>
          airportCode(r.source) === "PEN" &&
          airportCode(r.destination) === "KUL",
      )[0].departureDate,
    ).toBe("2027-01-27");
    expect(correctMalaysiaTrip(updated)).toBe(updated);
    updated.transport.find((x) => x.id === r.id)!.fare = 4000;
    expect(
      correctMalaysiaTrip(updated).transport.find((x) => x.id === r.id)!.fare,
    ).toBe(4000);
  });
  it("normalizes the legacy KLA typo only for the Malaysia planning route", () => {
    const t = previousMalaysia();
    const r = t.transport.find(
      (r) =>
        airportCode(r.source) === "KUL" && airportCode(r.destination) === "LGK",
    )!;
    r.source = "Kuala Lumpur (KLA)";
    const next = correctMalaysiaTrip(t);
    expect(next.transport.find((x) => x.id === r.id)!.source).toBe(
      "Kuala Lumpur (KUL)",
    );
    expect(transportationTotals(next).domestic).toBe(9297);
  });
  it("preserves confirmed or paid domestic flights, obsolete real booking history and hotel reservations", () => {
    const t = previousMalaysia();
    const r = t.transport.find(
      (r) =>
        airportCode(r.source) === "KUL" && airportCode(r.destination) === "LGK",
    )!;
    Object.assign(r, {
      status: "Booked",
      fare: 4100,
      paid: 2000,
      refunded: 300,
      reference: "Actual reservation",
      departureDate: "2027-01-20",
    });
    const old = t.transport.find((r) => r.id === "previous-pen-bom")!;
    Object.assign(old, {
      status: "Booked",
      paid: 1200,
      reference: "Confirmed Penang return",
    });
    const h = t.hotels.find((h) => h.destination === "Penang")!;
    h.status = "Booked";
    h.paid = 1000;
    const g = roundTripTicket(t)!;
    g.status = "Booked";
    g.paid = 4000;
    g.refunded = 500;
    const next = correctMalaysiaTrip(t);
    expect(next.transport.find((x) => x.id === r.id)).toEqual(r);
    expect(next.transport.find((x) => x.id === old.id)).toEqual(old);
    expect(next.hotels.find((x) => x.id === h.id)).toEqual(h);
    expect(next.fareGroups).toEqual(t.fareGroups);
    expect(malaysiaCorrectionWarnings(next)).toHaveLength(4);
    expect(totals(next).paid).toBe(totals(t).paid);
  });
  it("flags ambiguous repeated legs without adding a third duplicate", () => {
    const t = previousMalaysia();
    const r = t.transport.find((r) => airportCode(r.source) === "LGK")!;
    t.transport.push({ ...r, id: "existing-second-lgk-pen" });
    const next = correctMalaysiaTrip(t);
    expect(
      next.transport.filter(
        (r) =>
          airportCode(r.source) === "LGK" &&
          airportCode(r.destination) === "PEN",
      ),
    ).toHaveLength(2);
    expect(
      malaysiaCorrectionWarnings(next).some((s) => s.includes("Multiple LGK")),
    ).toBe(true);
  });
  it("does not alter any Malaysia + Singapore trip fields or financial amounts", () => {
    const s = seed();
    const before = structuredClone(s.trips[0]);
    s.trips[1] = previousMalaysia();
    const next = correctMalaysiaStore(s);
    expect(next.trips[0]).toBe(s.trips[0]);
    expect(next.trips[0]).toEqual(before);
    expect(costOverview(next.trips[0]).flights).toBe(48201);
    expect(transportationTotals(next.trips[0])).toEqual({
      international: 44634,
      domestic: 3567,
      local: 5000,
      total: 53201,
    });
  });
});
describe("legacy transit controls retire without losing finances", () => {
  it("does not invent default sightseeing expenses or delete legacy notes/settings", () => {
    const t = previousMalaysia(),
      l = t.layovers![0],
      a = t.activities.find((a) => a.layoverId)!;
    l.notes = "My transit notes";
    l.option = "Airport";
    const next = correctMalaysiaTrip(t);
    expect(next.expenses).toEqual(t.expenses);
    expect(next.layovers).toEqual(t.layovers);
    expect(next.activities.find((x) => x.id === a.id)).toMatchObject({
      ...a,
      retiredTransit: true,
    });
    expect(attachedLayoverLeg(next, l)).toBeUndefined();
  });
  it("moves a real included planning amount to Expenses once and preserves the original activity verbatim except retirement", () => {
    const t = previousMalaysia(),
      a = t.activities.find((a) => a.layoverId)!;
    Object.assign(a, {
      cost: 1500,
      costPending: false,
      includeInBudget: true,
      notes: "My vegetarian lunch and MRT research",
      status: "Booked",
      date: "2027-01-28",
    });
    const next = correctMalaysiaTrip(t),
      e = next.expenses.find((e) => e.sourceActivityId === a.id)!;
    expect(e).toMatchObject({
      amount: 1500,
      paid: 0,
      refunded: 0,
      includeInBudget: true,
      bookingStatus: "Booked",
      layoverId: a.layoverId,
    });
    expect(e.notes).toContain(a.notes);
    expect(next.activities.find((x) => x.id === a.id)).toEqual({
      ...a,
      retiredTransit: true,
    });
    expect(ledger(next).find((r) => r.id === a.id)!.active).toBe(false);
    expect(ledger(next).find((r) => r.id === e.id)).toMatchObject({
      active: true,
      total: 1500,
      booked: true,
    });
    expect(correctMalaysiaTrip(next)).toBe(next);
  });
  it("keeps excluded legacy estimates excluded and shows unknown prices as pending", () => {
    const t = previousMalaysia(),
      a = t.activities.find((a) => a.layoverId)!;
    a.cost = 1200;
    a.costPending = false;
    a.includeInBudget = false;
    const next = correctMalaysiaTrip(t),
      e = next.expenses.find((e) => e.sourceActivityId === a.id)!;
    expect(e.includeInBudget).toBe(false);
    expect(ledger(next).find((r) => r.id === e.id)!.active).toBe(false);
    expect(e.amount).toBe(1200);
  });
  it("recognizes an equivalent existing expense and never overwrites its payments or notes", () => {
    const t = previousMalaysia(),
      a = t.activities.find((a) => a.layoverId)!;
    a.cost = 1500;
    a.costPending = false;
    a.includeInBudget = true;
    a.date = "2027-01-28";
    const e = {
      ...blankExpense(),
      id: "existing-transit-payment",
      description: a.name,
      destination: a.destination,
      date: a.date,
      amount: 1500,
      paid: 700,
      refunded: 100,
      notes: "Receipt and payment preserved",
      bookingStatus: "Booked",
      paymentStatus: "Partially Paid",
    };
    t.expenses.push(e);
    const next = correctMalaysiaTrip(t);
    expect(next.expenses).toEqual(t.expenses);
    expect(next.expenses.filter((x) => x.amount === 1500)).toHaveLength(1);
    expect(totals(next).paid).toBe(totals(t).paid);
  });
});
describe("automatic saved-data correction and backups", () => {
  it("corrects a previous saved plan without resetting the store, losing payments, or repeating changes after refresh", () => {
    const s = seed();
    s.trips[1] = previousMalaysia();
    s.activeId = s.trips[1].id;
    s.trips[1].expenses[0].paid = 400;
    s.trips[1].expenses[0].paymentStatus = "Partially Paid";
    const raw = JSON.stringify(s);
    const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: (key: string) => (key === storageKey ? raw : null) },
    });
    try {
      const result = load();
      expect(result.error).toBe("");
      expect(result.data).toEqual(validate(migrateStore(s)));
      expect(result.data!.activeId).toBe(s.activeId);
      expect(result.data!.trips[0]).toEqual(s.trips[0]);
      expect(result.data!.trips[1].expenses[0]).toEqual(
        migrateStore(s).trips[1].expenses[0],
      );
      expect(validate(JSON.parse(JSON.stringify(result.data)))).toEqual(
        result.data,
      );
      expect(migrateStore(result.data!)).toBe(result.data);
    } finally {
      if (prior) Object.defineProperty(globalThis, "localStorage", prior);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
