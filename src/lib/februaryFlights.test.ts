import { describe, expect, it } from "vitest";
import { publishedSnapshotSeed, seed } from "./seed";
import {
  migrateStore,
  selectFlightAlternative,
  accommodationNeedsReview,
  addWeek,
  routeIs,
} from "./februaryFlights";
import { validate, load, storageKey } from "./storage";
import { costOverview } from "./overview";
import {
  daysBetween,
  hotelTotal,
  ledger,
  totals,
  travelMinutes,
  simulate,
} from "./calc";
import { layoverMinutes, transportationTotals } from "./transit";

describe("January–February 2027 flight plan", () => {
  it("updates both calendars once while keeping every hotel field, selection and cost exactly", () => {
    const old = publishedSnapshotSeed(),
      before = structuredClone(old),
      next = migrateStore(old);
    next.trips.forEach((t, i) => {
      expect(t).toMatchObject({
        start: "2027-01-23",
        end: "2027-02-03",
        february2027Revision: 1,
        plannedNights: 10,
      });
      expect(t.hotels).toBe(old.trips[i].hotels);
      expect(t.hotels).toEqual(before.trips[i].hotels);
      expect(t.hotels.map(hotelTotal)).toEqual(
        before.trips[i].hotels.map(hotelTotal),
      );
      expect(
        t.activities.map((a) => [a.id, a.date, a.cost, a.destination]),
      ).toEqual(
        before.trips[i].activities.map((a) => [
          a.id,
          addWeek(a.date),
          a.cost,
          a.destination,
        ]),
      );
      expect(t.stops.map((s) => s.name)).toEqual(
        before.trips[i].stops.map((s) => s.name),
      );
      expect(t.stops.reduce((s, r) => s + daysBetween(r.start, r.end), 0)).toBe(
        10,
      );
      expect(totals(t).hotels).toBe(totals(old.trips[i]).hotels);
      expect(t.simulation).toEqual(old.trips[i].simulation);
      expect(simulate(t)).toEqual(simulate(old.trips[i]));
      expect(accommodationNeedsReview(t)).toBe(true);
    });
    expect(old).toEqual(before);
    expect(migrateStore(next)).toBe(next);
    expect(validate(JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(seed().trips.map((t) => t.transport)).toEqual(
      next.trips.map((t) => t.transport),
    );
    expect(seed().trips.map((t) => t.fareGroups)).toEqual(
      next.trips.map((t) => t.fareGroups),
    );
  });
  it("uses one 22588 ticket with two accurate segments, SZB arrival and a 4h30 connection", () => {
    for (const t of seed().trips) {
      const group = t.fareGroups!.find((g) => g.id.endsWith(":feb-outbound"))!;
      expect(group).toMatchObject({
        amount: 22588,
        cabin: "Economy Value",
        paid: 0,
        status: "Researching",
      });
      const legs = t.transport.filter((r) => r.fareGroupId === group.id);
      expect(legs).toHaveLength(2);
      expect(legs[0]).toMatchObject({
        number: "SQ 423",
        provider: "Singapore Airlines",
        aircraft: "Airbus A380",
        departureDate: "2027-01-23",
        departureTime: "23:35",
        arrivalDate: "2027-01-24",
        arrivalTime: "07:30",
        departureTerminal: "T2",
        arrivalTerminal: "",
        cabinBaggageKg: 7,
        checkedBaggageKg: 25,
      });
      expect(legs[1]).toMatchObject({
        number: "SQ 8584",
        operatingCarrier: "Scoot",
        aircraft: "Airbus A320neo",
        departureTerminal: "T1",
        arrivalTime: "13:10",
        destination: "Kuala Lumpur Subang (SZB)",
      });
      expect(legs.map(travelMinutes)).toEqual([325, 70]);
      expect(legs.map((r) => r.fare + r.taxes + r.baggage + r.seat)).toEqual([
        0, 0,
      ]);
      const connection = t.layovers!.find((l) => l.connectionOnly)!;
      expect(layoverMinutes(connection)).toBe(270);
      expect(connection.arrivalTerminal).toBe("");
      expect(t.transport.some((r) => routeIs(r, "BOM", "KUL"))).toBe(false);
    }
  });
  it("counts the selected return once and does not invent AI 2108 metadata", () => {
    const t = seed().trips[0],
      options = t.transport.filter((r) => r.decisionId),
      a = options.find((r) => r.number === "AI 2106")!,
      b = options.find((r) => r.number === "AI 2108")!;
    expect(a).toMatchObject({
      fare: 15124,
      departureTime: "09:40",
      arrivalTime: "12:50",
      aircraft: "Airbus A321",
      departureTerminal: "T2",
      arrivalTerminal: "T2",
      checkedBaggageKg: 25,
      cabinBaggageKg: 7,
      selectedAlternative: false,
    });
    expect(b).toMatchObject({
      fare: 15124,
      departureTime: "19:40",
      arrivalTime: "23:25",
      aircraft: "",
      departureTerminal: "",
      arrivalTerminal: "",
      checkedBaggageKg: null,
      cabinBaggageKg: null,
      cabinBaggagePieces: null,
      selectedAlternative: true,
      fareType: "",
    });
    expect([travelMinutes(a), travelMinutes(b)]).toEqual([340, 375]);
    expect(costOverview(t).flights).toBe(46140);
    expect(transportationTotals(t).total).toBe(51140);
    expect(22588 + 3482 + 15124).toBe(41194);
    expect(t.transport.find((r) => routeIs(r, "LGK", "SIN"))).toMatchObject({
      fare: 4946,
      departureDate: "2027-01-30",
      quoteStatus: "Older estimate — requote needed",
    });
    const selectedA = selectFlightAlternative(t, a.id);
    expect(costOverview(selectedA).flights).toBe(46140);
    selectedA.transport.find((r) => r.id === b.id)!.fare = 999999;
    expect(costOverview(selectedA).flights).toBe(46140);
    expect(
      validate({
        ...seed(),
        trips: [selectedA, seed().trips[1]],
      }).trips[0].transport.find((r) => r.id === a.id)?.selectedAlternative,
    ).toBe(true);
    expect(
      ledger(t).filter((r) => options.some((o) => o.id === r.id) && r.active),
    ).toHaveLength(1);
  });
  it("replaces KUL–LGK with the complete 3482 quote and retains the stale Malaysia return without overlapping outbound cost", () => {
    const t = seed().trips[1],
      domestic = t.transport.find((r) => routeIs(r, "KUL", "LGK"))!;
    expect(domestic).toMatchObject({
      fare: 3482,
      taxes: 0,
      baggage: 0,
      seat: 0,
      number: "AK 6324",
      provider: "AirAsia Berhad",
      departureDate: "2027-01-27",
      departureTime: "12:55",
      arrivalTime: "14:00",
      departureTerminal: "T2",
      checkedBaggageKg: 20,
      refundable: false,
    });
    expect(travelMinutes(domestic)).toBe(65);
    expect(
      t.transport.find((r) => routeIs(r, "KUL", "BOM"))?.departureDate,
    ).toBe("2027-02-03");
    expect(t.transport.some((r) => routeIs(r, "SIN", "BOM"))).toBe(false);
    expect(t.fareGroups!.find((g) => g.amount === 35550)?.quoteStatus).toBe(
      "Older estimate — requote needed",
    );
    expect(t.fareGroups!.find((g) => g.amount === 22588)?.includeInBudget).toBe(
      false,
    );
    expect(costOverview(t).flights).toBe(44762);
    expect(transportationTotals(t).total).toBe(49762);
    expect(t.transport.find((r) => routeIs(r, "LGK", "PEN"))).toMatchObject({
      fare: 3251,
      departureDate: "2027-01-30",
    });
    expect(t.transport.find((r) => routeIs(r, "PEN", "KUL"))).toMatchObject({
      fare: 2479,
      departureDate: "2027-02-02",
    });
    const oldTransit = t.layovers!.find((l) => l.needsReconfirmation)!;
    expect(oldTransit).toMatchObject({
      date: "",
      arrivalTime: "",
      departureTime: "",
      arrivalTerminal: "",
      departureTerminal: "",
    });
    expect(layoverMinutes(oldTransit)).toBeNull();
    expect(oldTransit.notes).toContain("08:15–18:50");
  });
  it("preserves protected flight and ticket history byte-for-value and reports conflicts", () => {
    const s = publishedSnapshotSeed();
    s.trips[0].transport[0].paid = 1000;
    s.trips[0].transport[0].reference = "USER-REF";
    s.trips[0].transport[1].status = "Booked";
    s.trips[0].transport[3].refunded = 500;
    s.trips[0].transport[3].paid = 1000;
    s.trips[1].fareGroups![0].paid = 500;
    s.trips[1].fareGroups![0].reference = "TICKET-REF";
    const before = structuredClone(s),
      next = migrateStore(s);
    [0, 1, 3].forEach((i) =>
      expect(
        next.trips[0].transport.find(
          (r) => r.id === before.trips[0].transport[i].id,
        ),
      ).toEqual(before.trips[0].transport[i]),
    );
    expect(next.trips[0].transport.some((r) => r.decisionId)).toBe(false);
    expect(next.trips[1].fareGroups![0]).toEqual(
      before.trips[1].fareGroups![0],
    );
    [0, 3].forEach((i) =>
      expect(
        next.trips[1].transport.find(
          (r) => r.id === before.trips[1].transport[i].id,
        ),
      ).toEqual(before.trips[1].transport[i]),
    );
    expect(next.trips.every((t) => t.flightUpdateConflicts!.length > 0)).toBe(
      true,
    );
    expect(validate(next)).toEqual(next);
  });
  it("keeps unrelated/ambiguous scenarios and manually edited later data safe", () => {
    const s = publishedSnapshotSeed();
    const copy = { ...structuredClone(s.trips[0]), name: "My other trip" };
    s.trips.push(copy);
    expect(migrateStore(s).trips[2]).toBe(copy);
    const twins = publishedSnapshotSeed();
    const twin = structuredClone(twins.trips[0]);
    twin.id = "another";
    twin.hotels[0].id = "another:hotel:proof";
    twins.trips.push(twin);
    expect(migrateStore(twins).trips[0]).toBe(twins.trips[0]);
    const next = seed();
    next.trips[0].transport[0].departureTime = "23:00";
    expect(migrateStore(next)).toBe(next);
    const bad = seed();
    bad.trips[0].transport
      .filter((r) => r.decisionId)
      .forEach((r) => (r.selectedAlternative = true));
    expect(() => validate(bad)).toThrow();
    const paid = seed().trips[0],
      option = paid.transport.find((r) => r.selectedAlternative)!;
    option.paid = 100;
    expect(() =>
      selectFlightAlternative(
        paid,
        paid.transport.find((r) => r.decisionId && !r.selectedAlternative)!.id,
      ),
    ).toThrow();
  });
  it("preserves optional legacy hotel fields and explicitly unknown baggage on validation", () => {
    const old = publishedSnapshotSeed();
    delete old.trips[0].hotels[0].propertyTaxBasis;
    const next = validate(migrateStore(validate(old)));
    expect(next.trips[0].hotels).toEqual(old.trips[0].hotels);
    const b = next.trips[0].transport.find((r) => r.number === "AI 2108")!;
    expect(b.cabinBaggageKg).toBeNull();
  });
  it("loads an older saved plan once without changing raw recovery JSON or any hotel", () => {
    const old = publishedSnapshotSeed(),
      raw = JSON.stringify(old),
      prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: (key: string) => (key === storageKey ? raw : null) },
    });
    try {
      const result = load();
      expect(result.error).toBe("");
      expect(result.data).toEqual(validate(migrateStore(old)));
      expect(result.data!.trips.map((t) => t.hotels)).toEqual(
        old.trips.map((t) => t.hotels),
      );
      expect(localStorage.getItem(storageKey)).toBe(raw);
    } finally {
      if (prior) Object.defineProperty(globalThis, "localStorage", prior);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
