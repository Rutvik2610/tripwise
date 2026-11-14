import { describe, expect, it } from "vitest";
import { addAirportHotel } from "./airportHotel";
import { makeTrip, seed } from "./seed";
import { correctMalaysiaStore } from "./malaysiaCorrection";
import { hotelBreakdown, selectHotel, totals } from "./calc";
import { load, storageKey, validate } from "./storage";

const tune = (t: ReturnType<typeof makeTrip>) =>
  t.hotels.find((h) => h.name === "Tune Hotel KLIA-KLIA2")!;

describe("Tune KLIA final-stay candidate", () => {
  it("separates the base and whole-stay taxes and counts only a selected candidate", () => {
    const t = makeTrip(true),
      h = tune(t);
    expect(h).toMatchObject({
      checkIn: "2027-01-27",
      checkOut: "2027-01-28",
      nightly: 5302,
      taxes: 1948,
      currency: "INR",
      rate: 1,
      selected: false,
      status: "Researching",
      paid: 0,
      refunded: 0,
    });
    expect(hotelBreakdown(h)).toMatchObject({
      nights: 1,
      room: 5302,
      generalTax: 1948,
      atProperty: 0,
      total: 7250,
    });
    const selected = selectHotel(t, h.id);
    expect(totals(selected).estimated - totals(t).estimated).toBe(7250);
    expect(totals(selected).paid).toBe(totals(t).paid);
    expect(selected.hotels.filter((h) => h.checkIn === "2027-01-18")).toEqual(
      t.hotels.filter((h) => h.checkIn === "2027-01-18"),
    );
  });
  it("updates existing saved plans and backups once without changing other records", () => {
    const s = seed(),
      t = s.trips[1];
    t.hotels = t.hotels.filter((h) => h.id !== tune(t).id);
    const before = structuredClone(s);
    const next = validate(correctMalaysiaStore(s));
    expect(next.trips[0]).toEqual(before.trips[0]);
    expect(next.trips[1].hotels.slice(0, -1)).toEqual(before.trips[1].hotels);
    expect(totals(next.trips[1])).toEqual(totals(before.trips[1]));
    expect(correctMalaysiaStore(next)).toBe(next);
    const old = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) =>
          key === storageKey ? JSON.stringify(before) : null,
      },
    });
    try {
      expect(load().data).toEqual(next);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: old,
      });
    }
  });
  it("preserves an existing matching hotel including edited names, prices and payments", () => {
    const t = makeTrip(true),
      h = tune(t);
    Object.assign(h, {
      id: "manual-tune",
      name: "Tune Hotel KLIA – KLIA2",
      nightly: 6000,
      selected: true,
      status: "Booked",
      paid: 5000,
      refunded: 100,
      notes: "Reservation and payment history",
    });
    expect(addAirportHotel(t)).toBe(t);
    expect(t.hotels.filter((h) => h.name.includes("Tune"))).toHaveLength(1);
    expect(tune(makeTrip(true)).selected).toBe(false);
    const stable = makeTrip(true);
    tune(stable).name = "My airport hotel";
    expect(addAirportHotel(stable)).toBe(stable);
  });
});
