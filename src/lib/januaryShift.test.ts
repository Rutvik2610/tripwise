import { migrateStore as migrateFebruaryStore } from "./februaryFlights";
import { describe, expect, it } from "vitest";
import { makeTrip, templateSeed as seed } from "./seed";
import { migrateStore, shiftJanuaryTrip, shiftDateText } from "./januaryShift";
import { previousDay } from "./januaryDates";
import { daysBetween, hotelTotal, totals } from "./calc";
import { costOverview } from "./overview";
import { transportationTotals, layoverMinutes } from "./transit";
import { validate, load, storageKey } from "./storage";

function legacyStore() {
  const s = seed();
  s.trips = [makeTrip(), makeTrip(true)];
  s.activeId = s.trips[0].id;
  return s;
}
// Drop only date-bearing or migration-annotation fields to compare every other
// field, including IDs, financial history, record order, selections and times.
function nonDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(nonDates);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) => !["january2027Shift", "notes", "direction"].includes(k),
        )
        .map(([k, v]) => [k, nonDates(v)]),
    );
  return typeof value === "string" && /^\d{4}-\d\d-\d\d$/.test(value)
    ? "DATE"
    : value;
}
describe("January 2027 one-day shift", () => {
  it.each([false, true])(
    "shifts every dated record once without changing costs or nights (Malaysia %s)",
    (malaysia) => {
      const t = makeTrip(malaysia);
      t.transport[0].departureDate = "2027-01-17";
      t.transport[0].arrivalDate = "2027-01-18";
      t.transport[0].departureTime = "23:40";
      t.transport[0].arrivalTime = "06:10";
      t.transport[0].provider = "User airline";
      t.transport[0].number = "123";
      t.transport[0].reference = "ABC2027";
      t.hotels[0].status = "Booked";
      t.hotels[0].paid = 5000;
      t.hotels[0].refunded = 100;
      t.hotels[0].cancellationDeadline = "2027-01-12";
      t.hotels[0].notes =
        "Keep my room request. Stay 18–21 January 2027; deadline 2027-01-12.";
      if (t.layovers?.[0]) {
        t.layovers[0].date = "2027-01-28";
        t.layovers[0].direction = "Inbound";
      }
      const before = structuredClone(t),
        next = shiftJanuaryTrip(t);
      expect(t).toEqual(before);
      expect(next.start).toBe("2027-01-17");
      expect(next.end).toBe("2027-01-27");
      expect(next.transport[0]).toMatchObject({
        departureDate: "2027-01-16",
        arrivalDate: "2027-01-17",
        departureTime: "23:40",
        arrivalTime: "06:10",
        reference: "ABC2027",
      });
      expect(
        next.hotels.map((h) => daysBetween(h.checkIn, h.checkOut)),
      ).toEqual(t.hotels.map((h) => daysBetween(h.checkIn, h.checkOut)));
      expect(next.hotels.map(hotelTotal)).toEqual(t.hotels.map(hotelTotal));
      expect(next.activities.map((a) => a.date)).toEqual(
        t.activities.map((a) => previousDay(a.date)),
      );
      expect(next.checklist.map((c) => c.due)).toEqual(
        t.checklist.map((c) => previousDay(c.due)),
      );
      expect(next.expenses.map((e) => e.date)).toEqual(
        t.expenses.map((e) => previousDay(e.date)),
      );
      expect(next.stops.map((s) => [s.start, s.end])).toEqual(
        t.stops.map((s) => [previousDay(s.start), previousDay(s.end)]),
      );
      expect(next.transport.map((r) => r.departureDate)).toEqual(
        t.transport.map((r) => previousDay(r.departureDate)),
      );
      expect(next.hotels[0].cancellationDeadline).toBe("2027-01-11");
      expect(next.hotels[0].notes).toBe(
        "Keep my room request. Stay 17–20 January 2027; deadline 2027-01-11.",
      );
      expect(totals(next)).toEqual(totals(t));
      expect(transportationTotals(next)).toEqual(transportationTotals(t));
      expect(costOverview(next).flights).toBe(costOverview(t).flights);
      expect(nonDates(next)).toEqual(nonDates(t));
      expect(shiftJanuaryTrip(next)).toBe(next);
      if (malaysia) {
        expect(next.fareGroups?.[0].amount).toBe(35550);
        expect(next.layovers?.[0]).toMatchObject({
          date: "2027-01-27",
          direction: "Inbound",
          arrivalTime: "08:15",
          departureTime: "18:50",
        });
        expect(layoverMinutes(next.layovers![0])).toBe(635);
      }
    },
  );
  it("reconciles the old same-day outbound placeholder and dates the return transit without inventing times", () => {
    const t = shiftJanuaryTrip(makeTrip(true));
    expect(t.transport[0]).toMatchObject({
      departureDate: "2027-01-16",
      arrivalDate: "2027-01-17",
      departureTime: "",
      arrivalTime: "",
    });
    expect(t.layovers?.[0]).toMatchObject({
      date: "2027-01-27",
      direction: "Inbound",
    });
    expect(
      t.transport.every((r) =>
        r.notes.includes("not been independently reverified"),
      ),
    ).toBe(true);
    expect(t.stops.map((s) => [s.start, s.end])).toEqual([
      ["2027-01-17", "2027-01-20"],
      ["2027-01-20", "2027-01-23"],
      ["2027-01-23", "2027-01-26"],
      ["2027-01-26", "2027-01-27"],
    ]);
  });
  it("never replays prior repricing/additions, even for a very old backup", () => {
    const t = makeTrip(true);
    delete t.malaysiaPlanRevision;
    t.hotels = t.hotels.filter((h) => !h.name.includes("Tune"));
    t.transport[1].fare = 1234;
    const next = shiftJanuaryTrip(t);
    expect(next.hotels).toHaveLength(t.hotels.length);
    expect(next.transport[1].fare).toBe(1234);
    expect(totals(next)).toEqual(totals(t));
  });
  it("leaves custom trips, copies, approximate dates, renamed and marker-edited plans alone", () => {
    const original = makeTrip(true);
    for (const change of [
      { name: "My next adventure" },
      { name: original.name + " (copy)" },
      { start: "2027-01-19" },
      { january2027Shift: 1 as const },
    ]) {
      const t = { ...original, ...change };
      expect(shiftJanuaryTrip(t)).toBe(t);
    }
    const empty = { ...original, hotels: [], activities: [] };
    expect(shiftJanuaryTrip(empty)).toBe(empty);
    const s = legacyStore();
    s.trips.push({ ...original, name: "Other January route" });
    expect(migrateStore(s).trips[2]).toBe(s.trips[2]);
  });
  it("does not guess between duplicate scenario identities", () => {
    const s = legacyStore();
    s.trips.push(makeTrip(true));
    const next = migrateStore(s);
    expect(next.trips[1]).toBe(s.trips[1]);
    expect(next.trips[2]).toBe(s.trips[2]);
    expect(next.trips[0].start).toBe("2027-01-17");
  });
  it("adopts already shifted backups, preserves empty dates, and handles UTC boundaries", () => {
    const t = shiftJanuaryTrip(makeTrip(true));
    delete t.january2027Shift;
    const next = shiftJanuaryTrip(t);
    expect(next).toEqual({ ...t, january2027Shift: 1 });
    expect(previousDay("")).toBe("");
    expect(previousDay("2027-01-01")).toBe("2026-12-31");
    expect(
      shiftDateText("28 January 2027 at 06:55. INR 7250; 2027-01-28."),
    ).toBe("27 January 2027 at 06:55. INR 7250; 2027-01-27.");
  });
  it("loads/imports old and current JSON once without overwriting the original raw backup", () => {
    const s = legacyStore(),
      expected = validate(migrateStore(s));
    expect(migrateStore(expected)).toBe(expected);
    expect(validate(JSON.parse(JSON.stringify(expected)))).toEqual(expected);
    const raw = JSON.stringify(s),
      old = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: (k: string) => (k === storageKey ? raw : null) },
    });
    try {
      expect(load().data).toEqual(validate(migrateFebruaryStore(s)));
      expect(localStorage.getItem(storageKey)).toBe(raw);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: old,
      });
    }
    expect(
      seed().trips.every(
        (t) =>
          t.january2027Shift === 1 &&
          t.start === "2027-01-17" &&
          t.end === "2027-01-27",
      ),
    ).toBe(true);
  });
});
