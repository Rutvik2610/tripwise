import { migrateStore } from "./januaryShift";
import { blankTransport } from "./factories";
import { describe, it, expect } from "vitest";
import { makeTrip, templateSeed as seed } from "./seed";
import {
  applyMalaysiaPlan,
  roundTripTicket,
  attachedLayoverLeg,
  layoverMinutes,
  sightseeingWindow,
  transportationTotals,
  malaysiaPlanReview,
} from "./transit";
import { ledger, totals, transportTotal, travelMinutes } from "./calc";
import { costOverview } from "./overview";
import { validate, storageKey, load } from "./storage";
import type { Trip } from "./model";
function legacyMalaysia(): Trip {
  const t = makeTrip(true);
  t.transport = [
    {
      ...blankTransport(),
      id: "legacy-bom-kul",
      source: "Mumbai (BOM)",
      destination: "Kuala Lumpur (KUL)",
      departureDate: "2027-01-18",
      fare: 12500,
    },
    {
      ...blankTransport(),
      id: "legacy-kul-lgk",
      source: "Kuala Lumpur (KUL)",
      destination: "Langkawi (LGK)",
      departureDate: "2027-01-21",
      mode: "Domestic flight",
      fare: 3500,
    },
    {
      ...blankTransport(),
      id: "legacy-lgk-pen",
      source: "Langkawi (LGK)",
      destination: "Penang (PEN)",
      departureDate: "2027-01-24",
      mode: "Regional flight",
      fare: 2500,
    },
    {
      ...blankTransport(),
      id: "legacy-pen-bom",
      source: "Penang (PEN)",
      destination: "Mumbai (BOM)",
      departureDate: "2027-01-28",
      fare: 12000,
    },
  ];
  delete t.malaysiaPlanRevision;
  t.stops = t.stops
    .filter((s) => !(s.name === "Kuala Lumpur" && s.start === "2027-01-27"))
    .map((s) => (s.name === "Penang" ? { ...s, end: "2027-01-28" } : s));
  delete t.fareGroups;
  delete t.layovers;
  t.activities = t.activities.filter((a) => !a.layoverId);
  t.checklist = t.checklist.filter((c) => !c.id.includes(":sin-check-"));
  return t;
}
describe("Malaysia-only round-trip ticket", () => {
  it("counts the full international ticket exactly once and keeps both directions visible", () => {
    const t = makeTrip(true);
    const g = roundTripTicket(t)!;
    expect(g.amount).toBe(35550);
    expect(g.status).toBe("Researching");
    expect(g.paid).toBe(0);
    const linked = t.transport.filter((r) => r.fareGroupId === g.id);
    expect(linked).toHaveLength(2);
    expect(linked.map((r) => `${r.source} → ${r.destination}`)).toEqual([
      "Mumbai (BOM) → Kuala Lumpur (KUL)",
      "Kuala Lumpur (KUL) → Mumbai (BOM)",
    ]);
    expect(linked.every((r) => transportTotal(r) === 0)).toBe(true);
    expect(
      ledger(t)
        .filter((r) => r.isFareGroup)
        .reduce((s, r) => s + r.total, 0),
    ).toBe(35550);
    expect(transportationTotals(t)).toEqual({
      international: 35550,
      domestic: 9297,
      local: 5000,
      total: 49847,
    });
    expect(costOverview(t).flights).toBe(44847);
    expect(costOverview(t).flightCount).toBe(5);
  });
  it("leaves domestic flights and selected hotels unchanged during the explicit update", () => {
    const old = legacyMalaysia();
    const next = applyMalaysiaPlan(old);
    expect(
      next.transport.filter((r) => r.mode !== "International flight"),
    ).toEqual(old.transport.filter((r) => r.mode !== "International flight"));
    expect(next.hotels).toEqual(old.hotels);
    expect(next.stops).toEqual(old.stops);
    expect(next.start).toBe(old.start);
    expect(next.end).toBe(old.end);
    expect(totals(next).days).toBe(11);
    expect(totals(next).nights).toBe(10);
    expect(applyMalaysiaPlan(next)).toEqual(next);
  });
  it("preserves known applicable dates and schedules without fabricating a KUL return date or SIN direction", () => {
    const t = legacyMalaysia();
    t.transport[0].departureTime = "22:00";
    t.transport[0].provider = "User entered";
    const next = applyMalaysiaPlan(t);
    const out = next.transport.find((r) => r.source === "Mumbai (BOM)")!,
      inbound = next.transport.find(
        (r) =>
          r.source === "Kuala Lumpur (KUL)" && r.destination === "Mumbai (BOM)",
      )!;
    expect(out).toMatchObject({
      departureDate: "2027-01-18",
      departureTime: "22:00",
      provider: "User entered",
    });
    expect(inbound.departureDate).toBe("");
    expect(inbound.departureTime).toBe("");
    expect(travelMinutes(inbound)).toBeNull();
    expect(next.layovers?.[0]).toMatchObject({
      date: "",
      direction: "Unknown",
      arrivalTime: "08:15",
      departureTime: "18:50",
      timezone: "Asia/Singapore",
    });
    expect(
      next.transport.find((r) => r.source === "Penang (PEN)"),
    ).toMatchObject({ fare: 12000, status: "Cancelled" });
  });
  it("preserves paid, refunded, referenced, booked or cancelled flight records even after review", () => {
    for (const patch of [
      { paid: 1000 },
      { refunded: 100, paid: 100 },
      { reference: "Actual booking" },
      { status: "Booked" },
      { status: "Cancelled" },
    ]) {
      const t = legacyMalaysia();
      Object.assign(t.transport[0], patch);
      const before = structuredClone(t.transport);
      const next = applyMalaysiaPlan(t, true);
      expect(next.transport).toEqual(before);
      expect(next.fareGroups).toBeUndefined();
      expect(totals(next).estimated).toBe(totals(t).estimated);
      expect(next.layovers).toHaveLength(1);
    }
  });
  it("requires explicit approval for a changed unpaid fare and avoids duplicates on repeat application", () => {
    const t = legacyMalaysia();
    t.transport[0].fare = 22222;
    expect(malaysiaPlanReview(t).needsReview).toHaveLength(1);
    const safe = applyMalaysiaPlan(t);
    expect(safe.transport).toEqual(t.transport);
    expect(safe.fareGroups).toBeUndefined();
    const approved = applyMalaysiaPlan(safe, true);
    expect(transportationTotals(approved).international).toBe(35550);
    expect(approved.layovers).toHaveLength(1);
    expect(approved.activities.filter((a) => a.layoverId)).toHaveLength(1);
    expect(applyMalaysiaPlan(approved)).toEqual(approved);
  });
  it("does not modify the combined Malaysia + Singapore scenario or its 47,950 fares", () => {
    const t = makeTrip();
    const copy = structuredClone(t);
    expect(applyMalaysiaPlan(t, true)).toEqual(copy);
    expect(costOverview(t).flights).toBe(47950);
    expect(t.fareGroups).toBeUndefined();
    expect(t.layovers).toBeUndefined();
  });
  it("records ticket payments and refunds once, with unpaid commitments calculated at ticket level", () => {
    const t = makeTrip(true),
      g = roundTripTicket(t)!;
    g.status = "Booked";
    g.paid = 10000;
    g.refunded = 1000;
    expect(totals(t)).toMatchObject({
      paid: 9000,
      confirmed: 35550,
      unpaid: 26550,
      bookings: 1,
    });
    expect(costOverview(t).bookedFlights).toBe(35550);
    expect(transportationTotals(t).international).toBe(35550);
    g.status = "Cancelled";
    expect(transportationTotals(t).international).toBe(9000);
  });
  it("keeps the existing KUL return ID and known date when a matching unpaid route already exists", () => {
    const t = legacyMalaysia();
    const back = t.transport.find((r) => r.source === "Penang (PEN)")!;
    back.source = "Kuala Lumpur (KUL)";
    const next = applyMalaysiaPlan(t);
    expect(next.transport).toHaveLength(4);
    expect(next.transport.find((r) => r.id === back.id)).toMatchObject({
      fareGroupId: roundTripTicket(next)!.id,
      departureDate: "2027-01-28",
      source: "Kuala Lumpur (KUL)",
    });
  });
});
describe("Singapore transit without overnight assumptions", () => {
  it("calculates 10h35m in Singapore local time independently of host timezone", () => {
    const l = makeTrip(true).layovers![0];
    expect(layoverMinutes(l)).toBe(635);
    expect(l.timezone).toBe("Asia/Singapore");
    expect(sightseeingWindow(l)).toBeNull();
    expect(attachedLayoverLeg(makeTrip(true), l)).toBeUndefined();
  });
  it("attaches the layover only when both date and direction are supplied", () => {
    const t = makeTrip(true),
      l = t.layovers![0];
    l.date = "2027-01-28";
    expect(attachedLayoverLeg(t, l)).toBeUndefined();
    l.direction = "Inbound";
    expect(attachedLayoverLeg(t, l)?.source).toBe("Kuala Lumpur (KUL)");
    l.direction = "Outbound";
    expect(attachedLayoverLeg(t, l)?.source).toBe("Mumbai (BOM)");
    l.date = "";
    expect(attachedLayoverLeg(t, l)).toBeUndefined();
  });
  it("requires entry, baggage, ticket, terminal and timing verification before showing usable sightseeing time", () => {
    const l = makeTrip(true).layovers![0];
    Object.assign(l, {
      date: "2027-01-28",
      direction: "Inbound",
      entry: "Verified permitted",
      baggage: "Yes",
      protectedConnection: "Yes",
      additionalCheckIn: "No",
      arrivalTerminal: "T1",
      departureTerminal: "T2",
      option: "City",
      disembarkation: 45,
      immigration: 60,
      travelOut: 60,
      travelBack: 60,
      formalities: 45,
      baggageCheckIn: 0,
      safetyBuffer: 120,
    });
    expect(sightseeingWindow(l)).toEqual({
      start: 660,
      end: 905,
      minutes: 245,
      conservativeBuffer: true,
    });
    l.entry = "Verification pending";
    expect(sightseeingWindow(l)).toBeNull();
    l.entry = "Not permitted";
    expect(sightseeingWindow(l)).toBeNull();
  });
  it("never creates a Singapore hotel or overnight destination; excursion is optional and unpriced by default", () => {
    const t = makeTrip(true);
    expect(t.hotels.some((h) => h.destination === "Singapore")).toBe(false);
    expect(t.stops.some((s) => s.name === "Singapore")).toBe(false);
    const a = t.activities.find((a) => a.layoverId)!;
    expect(a).toMatchObject({
      includeInBudget: false,
      costPending: true,
      cost: 0,
      date: "",
      status: "Planned",
    });
    expect(
      t.checklist.some((c) =>
        c.title.startsWith("Verify Singapore transit-entry eligibility"),
      ),
    ).toBe(true);
  });
  it("includes optional excursion costs once and only when enabled, without touching the other trip", () => {
    const s = seed();
    s.trips[1] = applyMalaysiaPlan(legacyMalaysia());
    const t = s.trips[1],
      other = structuredClone(s.trips[0]),
      a = t.activities.find((a) => a.layoverId)!;
    const before = totals(t).estimated;
    a.cost = 1500;
    a.costPending = false;
    expect(totals(t).estimated).toBe(before);
    a.includeInBudget = true;
    expect(totals(t).estimated).toBe(before + 1500);
    a.includeInBudget = false;
    expect(totals(t).estimated).toBe(before);
    expect(s.trips[0]).toEqual(other);
  });
});
describe("version-1 backup extension compatibility", () => {
  it("round trips new ticket, transit and excursion fields with valid intra-trip links", () => {
    const s = seed();
    expect(validate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("accepts old backups and applies the date-only migration at the load boundary", () => {
    const s = seed();
    s.trips[1] = legacyMalaysia();
    expect(validate(JSON.parse(JSON.stringify(s)))).toEqual(s);
    const fake = new Map([[storageKey, JSON.stringify(s)]]);
    const before = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: (key: string) => fake.get(key) ?? null },
    });
    try {
      expect(load().data).toEqual(validate(migrateStore(s)));
      expect(JSON.parse(fake.get(storageKey)!)).toEqual(s);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: before,
      });
    }
  });
  it("rejects missing ticket links, duplicate IDs, double allocated leg fares and excessive ticket refunds", () => {
    const s = seed(),
      t = s.trips[1];
    const g = roundTripTicket(t)!;
    t.transport.find((r) => r.fareGroupId)!.fare = 100;
    expect(() => validate(s)).toThrow("ticket level");
    t.transport.find((r) => r.fareGroupId)!.fare = 0;
    g.refunded = 1;
    expect(() => validate(s)).toThrow("refunds");
    g.refunded = 0;
    t.transport.find((r) => r.fareGroupId)!.fareGroupId = "missing";
    expect(() => validate(s)).toThrow("missing fare group");
  });
});
