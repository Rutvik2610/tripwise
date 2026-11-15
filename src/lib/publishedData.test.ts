import { describe, it, expect } from "vitest";
import publishedData from "../data/published-trip-data.json";
import { seed } from "./seed";
import { validate } from "./storage";
import { withFlightAllowances } from "./flightAllowances";
import { totals, transportTotal } from "./calc";
import { costOverview } from "./overview";

describe("published November 15 user snapshot", () => {
  it("preserves every exported field and financial total with only allowance metadata added", () => {
    const original = validate(structuredClone(publishedData)),
      next = seed();
    const withoutAllowances = structuredClone(next);
    withoutAllowances.trips.forEach((t) =>
      t.transport.forEach((r) => {
        delete r.cabinBaggagePieces;
        delete r.cabinBaggageKg;
        delete r.checkedBaggageKg;
      }),
    );
    expect(withoutAllowances).toEqual(original);
    for (let i = 0; i < original.trips.length; i++) {
      expect(totals(next.trips[i])).toEqual(totals(original.trips[i]));
      expect(costOverview(next.trips[i])).toEqual(
        costOverview(original.trips[i]),
      );
    }
    expect(
      next.trips[0].transport.find(
        (r) =>
          r.source.includes("Langkawi") && r.destination.includes("Singapore"),
      )?.fare,
    ).toBe(4946);
    expect(
      next.trips[1].hotels.find((h) => h.name === "Tune Hotel KLIA-KLIA2")
        ?.selected,
    ).toBe(true);
    next.trips[0].hotels[0].notes = "local edit";
    expect(seed().trips[0].hotels[0].notes).not.toBe("local edit");
  });
  it("sets cabin and checked weights for every supplied flight without inventing baggage charges", () => {
    const s = seed();
    const expected = [
      [30, 20, 25, 25],
      [30, 20, 20, 25, 20],
    ];
    s.trips.forEach((t, i) => {
      expect(t.transport.map((r) => r.checkedBaggageKg)).toEqual(expected[i]);
      t.transport.forEach((r, j) => {
        expect(r).toMatchObject({ cabinBaggagePieces: 1, cabinBaggageKg: 7 });
        expect(transportTotal(r)).toBe(
          transportTotal(validate(publishedData).trips[i].transport[j]),
        );
      });
      expect(withFlightAllowances(t)).toEqual(t);
    });
  });
  it("keeps weights editable on shared-ticket legs and accepts old backups", () => {
    const s = seed(),
      linked = s.trips[1].transport.find((r) => r.fareGroupId)!;
    linked.checkedBaggageKg = 32;
    linked.cabinBaggageKg = 8;
    expect(validate(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(
      withFlightAllowances(s.trips[1]).transport.find((r) => r.id === linked.id)
        ?.checkedBaggageKg,
    ).toBe(32);
    expect(validate(publishedData).trips).toHaveLength(2);
    linked.checkedBaggageKg = -1;
    expect(() => validate(s)).toThrow();
  });
});
